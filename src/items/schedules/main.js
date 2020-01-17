document.addEventListener('DOMContentLoaded', function() {
'use strict';

const { el, tx, joinAnd  } = window.Util;
const { parseCourses, courseProperties } = window.Parsing;
const { makeObservable } = window.DeepObservables;
const { settings, prepareSettings } = window.Settings;
const { renderSchedule, createSettingsUI } = window.Display;


const $input    = document.getElementById('input');
const $errors   = document.getElementById('errors');
const $schedule = document.getElementById('schedule');
const $settings = document.getElementById('settings');
const $bookmark = document.getElementById('bookmark');

function getCourses() {
  const text = $input.value;

  let courses;
  const errors = [];

  try {
    courses = parseCourses(text);
  } catch (err) {
    errors.push("Unable to read courses; double-check your input. If you think it's an application error, contact me.");
    console.error(err);
  }

  if (courses && courses.length === 0) {
    errors.push("No courses detected. Please double-check your input.");
  }

  if (courses && errors.length === 0) {
    courses = courses.filter(course => {
      const missingKeys = Object.keys(course).filter(key => course[key] === null);
      const missingKeysPretty = missingKeys.map(k => courseProperties[k]);

      if (missingKeys.length > 0) {
        errors.push(`The course '${course.name}' is missing its ${joinAnd(missingKeysPretty)} and will be excluded.`);
        return false;
      } else {
        return true;
      }
    });
  }

  return [courses, errors];
}


function attachErrors() {
  const $li = el('<ul>');
  for (const error of state.errors) {
    $li.appendChild(el(`<li>${error}</li>`));
  }

  $errors.innerHTML = '';
  $errors.appendChild($li);
}


function attachSettingsUI() {
  const $settingsUI = createSettingsUI(state.courses);
  $settings.innerHTML = '';
  $settings.appendChild($settingsUI);
};


function attachSchedule() {
  const $scheduleTitle = document.getElementById('schedule-title');
  $scheduleTitle.innerHTML = '';
  $scheduleTitle.appendChild(el('<h2>Schedule</h2>'));

  $schedule.innerHTML = '';
  const $shadowContainer = el('<div>');
  $schedule.appendChild($shadowContainer);
  const $shadowRoot = $shadowContainer.attachShadow({ mode: 'open' });

  const $rendered = renderSchedule(state.courses);
  $shadowRoot.appendChild($rendered);
}


function attachBookmark() {
  $bookmark.innerHTML = '';
  $bookmark.appendChild(el('<h2>Bookmark</h2>'));
  $bookmark.appendChild(el(`<p>When you're happy with your schedule, you can save it by dragging the following link to your bookmark bar:</p>`));

  // Note that this does not transmit hex color codes properly:
  const html = `<title>Semester Schedule</title> ${encodeURI($schedule.outerHTML)}`;
  $bookmark.appendChild(el(`<a href="data:text/html, ${html}">Semester schedule</a>`));
}

// == Main == //

const state = makeObservable({

  // Parsed courses
  courses: null,

  // Errors from parsing
  errors: null,

});


$input.addEventListener('input', () => {
  state.atomically(() => {
    const [newCourses, newErrors] = getCourses();

    if (typeof newCourses !== 'undefined') {
      state.courses = newCourses;
    } else {
      state.courses = [];
    }

    state.errors = newErrors;
  });
});

state.addObserver('errors', () => {
  attachErrors();
});

state.addObserver('courses', () => {
  prepareSettings(state.courses);
  attachSettingsUI();
});

settings.addObserver(() => {
  attachSchedule();
  attachBookmark();
});


});





