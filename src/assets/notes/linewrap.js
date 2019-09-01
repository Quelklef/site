// Modified from https://github.com/xdamman/js-line-wrap-detector

(function() {

  function wrapWords(text, before, after, join = ' ') {
    var words = text.split(' ');
    for (let i = 0; i < words.length; i++) {
      words[i] = before + words[i] + after;
    }
    return words.join(join);
  };

   function wrapWordsInChildElement(el) {
    if (el.nodeName == '#text') {
      var words = el.textContent.split(' ');
      for (var i = 0; i < words.length; i++) {
        if (words[i].length > 0) {
          var span = document.createElement('span');
          span.className = "js-detect-wrap";
          span.innerText = words[i];
          el.parentNode.insertBefore(span, el);
        }
        if (i < words.length - 1) {
          el.parentNode.insertBefore(document.createTextNode(" "), el);
        }
      }
      el.parentNode.removeChild(el);
    } else {
      if (el.innerText) {
        el.innerHTML = wrapWords(el.innerText, '<span class="js-detect-wrap">','</span>');
      }
    }
  };

  function wrapWordsInElement(el) {
    if (el.id && el.id.includes("MathJax")) {
      // Treat MathJax atomically
      el.classList.add('js-detect-wrap');
    } else if (!el.firstChild) {
      wrapWordsInChildElement(el);
    } else {
      var siblings = [];
      var s = el.firstChild;
      do {
        siblings.push(s);
      } while (s = s.nextSibling);

      for (var i = 0; i < siblings.length; i++) {
        wrapWordsInElement(siblings[i]);
      }
    }
  }

  var getLines = function(el) {
    wrapWordsInElement(el);
    var spans = el.getElementsByClassName('js-detect-wrap');

    var lineOffset = null;
    var lineHeight = null;
    var line = [];
    var lines = [];
    for (let i = 0; i < spans.length; i++) {
      let spanHeight = spans[i].getBoundingClientRect().height;
      let offset = spans[i].offsetTop + spanHeight;
      if (lineOffset === null) {
        lineOffset = offset;
        lineHeight = spanHeight / 2;
      }

      // When testing if we're on a new line, we account for anomolies (e.g. MathJax)
      // by allowing items to go back up as well as go a little bit down (0.5em)
      if (offset > lineOffset + lineHeight / 2) {
        lines.push(line);
        line = [];
        lineOffset = offset;
        lineHeight = spanHeight / 2;
      }
      line.push(spans[i]);
    }
    lines.push(line);

    return lines;
  }

  function getLastWordOnLineWith(el, paragraph) {
    // Get the last word on the same line as the given element
    wrapWordsInElement(paragraph);
    let spans = paragraph.getElementsByClassName('js-detect-wrap');

    let elBottom = el.offsetTop + el.getBoundingClientRect().height;
    // Where we consider the start of the "next line"
    let threshold = elBottom + el.getBoundingClientRect().height / 2;
    var prevWord;
    for (let i = 0; i < spans.length - 1; i++) {
      let word = spans[i];
      if (word.offsetTop + word.getBoundingClientRect().height > threshold) {
        return prevWord;
      }
      prevWord = word;
    }

    return paragraph.childNodes[paragraph.childNodes.length - 1];
  }

  window.lastWordInLine = getLastWordOnLineWith;

})();

