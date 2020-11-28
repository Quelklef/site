/** Returns an element's height without padding, border, or margin */
function innerHeight(element) {
  const style = window.getComputedStyle(element);
  return (
    element.clientHeight -
    style.getPropertyValue("padding-top").replace("px", "") -
    style.getPropertyValue("padding-bottom").replace("px", "")
  );
}

/** Returns an element's scroll height without padding, border, or margin */
function innerScrollHeight(element) {
  const style = window.getComputedStyle(element);
  return (
    element.scrollHeight -
    style.getPropertyValue("border-top-width").replace("px", "") -
    style.getPropertyValue("border-bottom-width").replace("px", "") -
    style.getPropertyValue("padding-top").replace("px", "") -
    style.getPropertyValue("padding-bottom").replace("px", "")
  );
}

/** Given a <textarea>, return the line number of the first visible line.
    Note that the element must not allow for wrapping lines. */
function firstVisibleLineNumber(textarea) {
  const lineCount = textarea.value.split("\n").length;
  const linePixelHeight = innerScrollHeight(textarea) / lineCount;
  const linesScrolled = Math.round(textarea.scrollTop / linePixelHeight);
  return linesScrolled;
}

/** Enumerates the given array from the given start index (inclusive)
    by the given step, returning the first item that is truthy. */
function findTruthy(array, { start, step }) {
  for (let i = start; i > 0 && i < array.length; i += step) {
    const item = array[i];
    if (!!item) return item;
  }
}

/** Given some text and a line number, returns all lines from the text which
    are followed by an indent that is not closed before the given line number.

    For example, given

      1| function f() {
      2|   call();
      3|   function g() { }
      4|   function h() {
      5|     call();
      6|   }
      7| }

    and lineno = 5, this function will return

      [ "function f() {"
      , "  function h() {" ]

    (Actually, there's also some magic done to deal with the fact that we then
     prepend the results of this to the input text itself within the demo)
*/
function contexts(text, lineno) {
  const lines = text.split("\n");
  const indentation = (line) => line.length - line.trimStart().length;

  lineno += 1;

  let contexts = [];
  let indents = [];
  for (let i = 0; i < lines.length && i < lineno; i++) {
    const prevLine = findTruthy(lines, { start: i - 1, step: -1 });
    const thisLine = lines[i];
    const nextLine = findTruthy(lines, { start: i + 1, step: +1 });

    if (!thisLine) continue;

    while (
      indents.length > 0 &&
      indentation(thisLine) <= indents[indents.length - 1]
    ) {
      contexts.pop();
      indents.pop();
      lineno--;
    }

    if (nextLine && indentation(nextLine) > indentation(thisLine)) {
      contexts.push(thisLine);
      indents.push(indentation(thisLine));
      lineno++;
    }
  }

  return contexts;
}

/** Edits appends the contexts of #textarea to #contexts */
function go() {
  const editor = document.querySelector("#editor");
  const textarea = editor.querySelector("textarea");
  const contextsEl = editor.querySelector("#contexts");

  contextsEl.innerText = contexts(
    textarea.value,
    firstVisibleLineNumber(textarea)
  ).join("\n");
}

const textarea = document.querySelector("#textarea");
textarea.innerHTML = window.sampleCode;
textarea.addEventListener("scroll", go);
