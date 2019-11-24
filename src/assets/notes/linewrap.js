// Modified from https://github.com/xdamman/js-line-wrap-detector

(function() {
  'use strict';

  function ensureDescendantTextNodesWrapped(parentNode) {
    /* Given an element containing a bunch of text nodes,
     * wrap the text noted in a <span class="__linewrap">
     */

    // Get a clone of the children array which is NOT in sync with .childNodes
    const children = Array.from(parentNode.childNodes);
    for (const childNode of children) {
      // Don't do anything if already wrapped
      if (childNode.classList && childNode.classList.contains('__linewrap')) {
        return;
      }

      // Treat MathJax atomically
      if (childNode.id && childNode.id.includes("MathJax")) {
        childNode.classList.add('__linewrap');
      } else if (childNode.nodeName === "#text") {
        const words = childNode.textContent.split(' ');
        words.forEach((word, wordIdx) => {
          const span = document.createElement('span');
          span.className = '__linewrap';
          span.innerText = word;
          parentNode.insertBefore(span, childNode);
          if (wordIdx !== words.length - 1) {
            parentNode.insertBefore(document.createTextNode(' '), childNode);
          }
        });
        parentNode.removeChild(childNode);
      } else {
        ensureDescendantTextNodesWrapped(childNode);
      }
    }

  }

  function getLastWordOnLineWith(el, paragraph) {
    const elBottom = el.getBoundingClientRect().y + el.getBoundingClientRect().height;

    // Where we consider the start of the "next line"
    // (Doing it this way is useful to work properly with things like e.g. MathJax,
    // where symbols can just out a little bit below the bottom of the line they're in.)
    const threshold = elBottom + el.getBoundingClientRect().height / 4;

    // Get the last word on the same line as the given element
    ensureDescendantTextNodesWrapped(paragraph);
    const spans = paragraph.getElementsByClassName('__linewrap');

    if (spans.length === 1) return spans[0];

    for (let i = 1; i < spans.length; i++) {
      const word = spans[i];
      const prevWord = spans[i-1];
      const wordBottom = word.getBoundingClientRect().y + word.getBoundingClientRect().height;
      if (wordBottom > threshold) {
        return prevWord;
      }
    }

    return spans[spans.length - 1];
  }

  window.getLastWordOnLineWith = getLastWordOnLineWith;

})();


