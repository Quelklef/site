function findPos(obj) { // From https://www.quirksmode.org/js/findpos.html
  var curleft = curtop = 0;
  if (obj.offsetParent) {
    do {
      curleft += obj.offsetLeft;
      curtop += obj.offsetTop;
    } while (obj = obj.offsetParent);
  }
	return [curleft,curtop];
}

const Note = { };

const NoteRef = {
  render: () => hybrids.html`<span onclick="${refOnClick}"><slot></slot></span>`
};

function refOnClick(host) {
  const note = document.getElementById(host.getAttribute('to'));

  // Display the note:
  // If it's already showing,
  const existingClone = document.getElementById(note.id + '-clone');
  if (existingClone) {
    // Then close it
    existingClone.remove();
  } else { // Otherwise, open it
    // First, we need to find the last word before the next linebreak.
    const paragraph = host.parentNode;
    const lastWord = lastWordInLine(host, paragraph);

    // Make a clone
    const noteClone = note.cloneNode(true);
    // Identify the clone separately
    // (keeps unique ID + used in logic elsewhere)
    noteClone.id = note.id + "-clone";
    // Place it after the clicked node
    lastWord.parentNode.insertBefore(noteClone, lastWord.nextSibling);
    // And add the display class to the clone
    noteClone.classList.add('visible');

    // Additionally, place the triangle
    const triang = document.createElement('span');
    triang.className = 'triangle';
    // Place within note
    noteClone.appendChild(triang);
    const xCoordinate = Math.floor(
      host.offsetLeft - noteClone.offsetLeft +
        (host.getBoundingClientRect().width - triang.getBoundingClientRect().width) / 2
    );
    triang.style.left = xCoordinate;
  }
}
hybrids.define('note-def', Note);
hybrids.define('note-ref', NoteRef);

