/**
 * Content script: fix RTL / mixed Persian+English rendering on AI chat UIs.
 */
(function () {
  'use strict';

  const D = window.FaRtlDetector;
  const MARK = D.MARK_ATTR;
  const DEBOUNCE_MS = 120;

  let enabled = true;
  let observer = null;
  let debounceTimer = null;
  let pendingNodes = new Set();

  // Site-specific roots where chat messages usually live (fallback: document.body)
  const ROOT_SELECTORS = [
    '[data-message-author-role]',
    '[data-testid="conversation-turn"]',
    '.markdown',
    '.prose',
    '.message-content',
    '.chat-message',
    '[class*="message"]',
    'main',
    '[role="main"]',
    'article',
  ];

  function loadSettings() {
    try {
      chrome.storage.sync.get({ enabled: true }, (data) => {
        enabled = data.enabled !== false;
        if (enabled) start();
        else stop();
      });
    } catch {
      start();
    }
  }

  function start() {
    if (observer) return;
    scanDocument();
    observer = new MutationObserver(onMutations);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function stop() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    document.querySelectorAll(`[${MARK}]`).forEach((el) => {
      el.removeAttribute(MARK);
      el.removeAttribute('dir');
      el.classList.remove('fa-rtl-block', 'fa-rtl-inline', 'fa-rtl-mixed');
    });
  }

  function onMutations(mutations) {
    if (!enabled) return;

    for (const m of mutations) {
      if (m.type === 'characterData' && m.target.parentElement) {
        const parent = m.target.parentElement;
        parent.removeAttribute(MARK);
        pendingNodes.add(parent);
        continue;
      }
      for (const node of m.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          pendingNodes.add(node);
        } else if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
          node.parentElement.removeAttribute(MARK);
          pendingNodes.add(node.parentElement);
        }
      }
    }

    scheduleProcess();
  }

  function scheduleProcess() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(flushPending, DEBOUNCE_MS);
  }

  function flushPending() {
    const batch = [...pendingNodes];
    pendingNodes.clear();
    for (const node of batch) {
      processSubtree(node);
    }
  }

  function scanDocument() {
    const roots = findRoots();
    for (const root of roots) {
      processSubtree(root);
    }
  }

  function findRoots() {
    const found = new Set();
    for (const sel of ROOT_SELECTORS) {
      document.querySelectorAll(sel).forEach((el) => found.add(el));
    }
    if (found.size === 0 && document.body) found.add(document.body);
    return found;
  }

  function processSubtree(root) {
    if (!enabled || !root) return;

    if (root.nodeType === Node.ELEMENT_NODE) {
      fixElement(root);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
      let el = walker.currentNode;
      while (el) {
        fixElement(el);
        el = walker.nextNode();
      }
    }
  }

  function fixElement(el) {
    if (D.shouldSkipElement(el)) return;

    const text = D.getElementText(el);
    if (!text || !D.hasRtlText(text)) return;

    const analysis = D.analyzeText(text);
    if (!analysis.hasRtl || !analysis.direction) return;

    // Leaf-ish blocks: element has little nested structure with its own RTL text
    const directText = D.getDirectTextContent(el);
    const children = [...el.children].filter((c) => !D.SKIP_TAGS.has(c.tagName));
    const isLeafy = directText.length > 0 || children.length === 0;

    if (!D.isBlockLike(el) && !isLeafy) return;

    // Don't override explicit user/code LTR islands
    if (el.closest('pre, code') && el.tagName !== 'P' && el.tagName !== 'LI') return;

    applyFix(el, analysis);
  }

  function applyFix(el, analysis) {
    if (el.hasAttribute(MARK)) return;

    el.setAttribute(MARK, '1');
    el.setAttribute('dir', analysis.direction);

    const isInline =
      el.tagName === 'SPAN' ||
      el.tagName === 'A' ||
      el.tagName === 'LABEL' ||
      el.tagName === 'BUTTON';

    el.classList.add(isInline ? 'fa-rtl-inline' : 'fa-rtl-block');

    if (analysis.rtlRatio > 0 && analysis.rtlRatio < 0.7) {
      el.classList.add('fa-rtl-mixed');
    }

    // Fix list markers for RTL lists
    if (el.tagName === 'LI' && analysis.direction === 'rtl') {
      const list = el.closest('ul, ol');
      if (list && !list.hasAttribute(MARK)) {
        list.setAttribute(MARK, '1');
        list.setAttribute('dir', 'rtl');
        list.classList.add('fa-rtl-block');
      }
    }

    // Tables: set direction on row cells consistently
    if (el.tagName === 'TD' || el.tagName === 'TH') {
      const row = el.closest('tr');
      if (row) {
        const rowText = D.getElementText(row);
        if (D.hasRtlText(rowText)) {
          const rowAnalysis = D.analyzeText(rowText);
          if (rowAnalysis.direction === 'rtl') {
            row.setAttribute('dir', 'rtl');
            row.classList.add('fa-rtl-block');
          }
        }
      }
    }
  }

  // Listen for popup toggle
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync' || !changes.enabled) return;
      enabled = changes.enabled.newValue !== false;
      if (enabled) {
        document.querySelectorAll(`[${MARK}]`).forEach((el) => el.removeAttribute(MARK));
        start();
      } else {
        stop();
      }
    });
  } catch {
    /* ignore */
  }

  loadSettings();
})();
