/**
 * RTL script detection and bidirectional text helpers.
 */
(function (global) {
  'use strict';

  // Arabic, Persian, Urdu, etc.
  const RTL_CHAR =
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

  // Latin letters and digits (LTR strong chars)
  const LTR_CHAR = /[A-Za-z0-9]/;

  const SKIP_TAGS = new Set([
    'SCRIPT',
    'STYLE',
    'NOSCRIPT',
    'SVG',
    'MATH',
    'CODE',
    'PRE',
    'KBD',
    'SAMP',
    'TEXTAREA',
    'INPUT',
    'SELECT',
    'OPTION',
    'CANVAS',
    'IFRAME',
  ]);

  const MARK_ATTR = 'data-persian-rtl-fixed';

  function hasRtlText(text) {
    return RTL_CHAR.test(text);
  }

  /**
   * Count RTL vs LTR strong characters to pick paragraph direction.
   */
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
    const hasRtl = rtl > 0;

    let direction = null;
    if (hasRtl) {
      direction = rtlRatio >= 0.3 ? 'rtl' : 'auto';
    }

    return { hasRtl, direction, rtlRatio };
  }

  function getDirectTextContent(el) {
    let text = '';
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      }
    }
    return text.trim();
  }

  function getElementText(el) {
    return (el.textContent || '').trim();
  }

  function shouldSkipElement(el, inputSelectors) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return true;
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.closest('code, pre, kbd, samp, textarea, input')) return true;

    const ce = el.closest('[contenteditable="true"]');
    if (ce && ce !== el && !(inputSelectors && el.matches && el.matches(inputSelectors))) {
      return true;
    }
    if (el.hasAttribute(MARK_ATTR)) return true;
    if (el.getAttribute('dir') === 'ltr' && el.classList.contains('fa-rtl-force-ltr')) {
      return true;
    }
    return false;
  }

  function isBlockLike(el) {
    const tag = el.tagName;
    return (
      tag === 'P' ||
      tag === 'LI' ||
      tag === 'TD' ||
      tag === 'TH' ||
      tag === 'DD' ||
      tag === 'DT' ||
      tag === 'BLOCKQUOTE' ||
      tag === 'FIGCAPTION' ||
      tag === 'H1' ||
      tag === 'H2' ||
      tag === 'H3' ||
      tag === 'H4' ||
      tag === 'H5' ||
      tag === 'H6' ||
      tag === 'DIV' ||
      tag === 'SPAN' ||
      tag === 'ARTICLE' ||
      tag === 'SECTION' ||
      tag === 'ASIDE' ||
      tag === 'LABEL' ||
      tag === 'A' ||
      tag === 'BUTTON'
    );
  }

  global.FaRtlDetector = {
    RTL_CHAR,
    MARK_ATTR,
    SKIP_TAGS,
    hasRtlText,
    analyzeText,
    getDirectTextContent,
    getElementText,
    shouldSkipElement,
    isBlockLike,
  };
})(typeof window !== 'undefined' ? window : self);
