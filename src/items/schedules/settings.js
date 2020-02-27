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

  courses: {
    // For each course there will be
    // [course.name]: {
    //   id              : integer,
    //   shortName       : string,
    //   backgroundColor : string,
    //   textColor       : string,
    // }
  },

});


const prepareSettings =
window.Settings.prepareSettings =
function prepareSettings(courses) {
  /* Add default settings for each course that doesn't have them. */
  settings.atomically(() => {
    for (const course of courses) {
      if (!(course.name in settings.courses)) {
        settings.courses[course.name] = defaultSettings(course);
      }
    }
  });
}


let id = 0;
const nextId = () => id++;

function defaultSettings(course) {
  return {
    id              : nextId(),
    shortName       : shortenName(course.name),
    backgroundColor : randomColor(),
    textColor       : '#ffffff',
  }
}


})();
