/* eslint-env browser */
/* Injected into Cursor workbench — RTL fix for AI chat panels */
(function () {
  'use strict';

  if (window.__PERSIAN_RTL_CURSOR__) return;
  window.__PERSIAN_RTL_CURSOR__ = true;

  const RTL_CHAR =
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const LTR_CHAR = /[A-Za-z0-9]/;
  const MARK = 'data-persian-rtl-fixed';
  const DEBOUNCE_MS = 120;

  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'MATH', 'CODE', 'PRE',
    'KBD', 'SAMP', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CANVAS', 'IFRAME',
  ]);

  const ROOT_SELECTORS = [
    '.anysphere-markdown-container-root',
    '.markdown-root',
    '.markdown-section',
    '.composer-bar',
    '.pane-body.aichat-pane',
    '.aislash-editor-input-readonly',
    '.part.auxiliarybar',
    '.markdown',
    '[class*="markdown"]',
    '[class*="composer"]',
    '[class*="message"]',
  ];

  const INPUT_SELECTORS = '.aislash-editor-input, .aislash-editor-input-readonly';

  let debounceTimer = null;
  let pendingNodes = new Set();
  let observer = null;

  function hasRtlText(text) {
    return RTL_CHAR.test(text);
  }

  function analyzeText(text) {
    let rtl = 0;
    let ltr = 0;
    for (const ch of text) {
      if (RTL_CHAR.test(ch)) rtl++;
      else if (LTR_CHAR.test(ch)) ltr++;
    }
    const total = rtl + ltr;
    if (total === 0) return { hasRtl: false, direction: null, rtlRatio: 0 };
    const rtlRatio = rtl / total;
    if (rtl === 0) return { hasRtl: false, direction: null, rtlRatio: 0 };
    return {
      hasRtl: true,
      direction: rtlRatio >= 0.3 ? 'rtl' : 'auto',
      rtlRatio,
    };
  }

  function getElementText(el) {
    return (el.textContent || '').trim();
  }

  function getDirectTextContent(el) {
    let text = '';
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) text += node.textContent;
    }
    return text.trim();
  }

  function shouldSkipElement(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return true;
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.closest('code, pre, kbd, samp')) return true;
    if (el.hasAttribute(MARK)) return true;

    const ce = el.closest('[contenteditable="true"]');
    if (ce && ce !== el && !el.matches(INPUT_SELECTORS)) return true;

    return false;
  }

  function isBlockLike(el) {
    const tag = el.tagName;
    return /^(P|LI|TD|TH|DD|DT|BLOCKQUOTE|FIGCAPTION|H[1-6]|DIV|SPAN|ARTICLE|SECTION|ASIDE|LABEL|A|BUTTON)$/.test(tag);
  }

  function isCursorInput(el) {
    return el.matches && el.matches(INPUT_SELECTORS);
  }

  function applyFix(el, analysis) {
    if (el.hasAttribute(MARK)) return;

    el.setAttribute(MARK, '1');
    el.setAttribute('dir', analysis.direction);

    const isInline =
      el.tagName === 'SPAN' || el.tagName === 'A' || el.tagName === 'LABEL';

    el.classList.add(isInline ? 'fa-rtl-inline' : 'fa-rtl-block');
    if (analysis.rtlRatio > 0 && analysis.rtlRatio < 0.7) {
      el.classList.add('fa-rtl-mixed');
    }

    if (el.tagName === 'LI' && analysis.direction === 'rtl') {
      const list = el.closest('ul, ol');
      if (list && !list.hasAttribute(MARK)) {
        list.setAttribute(MARK, '1');
        list.setAttribute('dir', 'rtl');
        list.classList.add('fa-rtl-block');
      }
    }
  }

  function fixElement(el) {
    if (shouldSkipElement(el)) return;

    const text = getElementText(el);
    if (!text || !hasRtlText(text)) return;

    const analysis = analyzeText(text);
    if (!analysis.hasRtl || !analysis.direction) return;

    if (isCursorInput(el)) {
      applyFix(el, analysis);
      return;
    }

    const directText = getDirectTextContent(el);
    const children = [...el.children].filter((c) => !SKIP_TAGS.has(c.tagName));
    const isLeafy = directText.length > 0 || children.length === 0;

    if (!isBlockLike(el) && !isLeafy) return;
    if (el.closest('pre, code') && el.tagName !== 'P' && el.tagName !== 'LI') return;

    applyFix(el, analysis);
  }

  function processSubtree(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return;
    fixElement(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let el = walker.currentNode;
    while (el) {
      fixElement(el);
      el = walker.nextNode();
    }
  }

  function findRoots() {
    const found = new Set();
    for (const sel of ROOT_SELECTORS) {
      try {
        document.querySelectorAll(sel).forEach((el) => found.add(el));
      } catch {
        /* invalid selector in old builds */
      }
    }
    document.querySelectorAll(INPUT_SELECTORS).forEach((el) => found.add(el));
    if (found.size === 0 && document.body) found.add(document.body);
    return found;
  }

  function scanDocument() {
    for (const root of findRoots()) processSubtree(root);
  }

  function flushPending() {
    const batch = [...pendingNodes];
    pendingNodes.clear();
    for (const node of batch) processSubtree(node);
  }

  function scheduleProcess() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(flushPending, DEBOUNCE_MS);
  }

  function onMutations(mutations) {
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

  function start() {
    scanDocument();
    if (observer) return;
    observer = new MutationObserver(onMutations);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
