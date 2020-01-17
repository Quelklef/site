(function() {
'use strict';

const { shortenName, randomColor } = window.Util;
const { makeObservable } = window.DeepObservables;

window.Settings = {};


const settings =
window.Settings.settings = makeObservable({

  timeFormat: 'standard',

  cellWidth: 20,
  cellHeight: 30,

  weekend: 'none',

  sections: {
    // For each section there will be
    // [section.name]: {
    //   id              : integer,
    //   shortName       : string,
    //   backgroundColor : string,
    //   textColor       : string,
    // }
  },

});


const prepareSettings =
window.Settings.prepareSettings =
function prepareSettings(sections) {
  /* Add default settings for each section that doesn't have them. */
  settings.atomically(() => {
    for (const section of sections) {
      if (!(section.name in settings.sections)) {
        settings.sections[section.name] = defaultSettings(section);
      }
    }
  });
}


let id = 0;
const nextId = () => id++;

function defaultSettings(section) {
  return {
    id              : nextId(),
    shortName       : shortenName(section.name),
    backgroundColor : randomColor(),
    textColor       : '#ffffff',
  }
}


})();
