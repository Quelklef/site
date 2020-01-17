document.addEventListener('DOMContentLoaded', function() {
'use strict';

const { el, tx  } = window.Util;
const { makeObservable } = window.DeepObservables;
const { settings, prepareSettings } = window.Settings;
const { renderSchedule, createSettingsUI } = window.Display;


const $input    = document.getElementById('input');
const $schedule = document.getElementById('schedule');
const $settings = document.getElementById('settings');
const $bookmark = document.getElementById('bookmark');

function getCourses() {
  const text = $input.value;
  let courses = window.Parsing.parseCourses(text);

  // TODO: If a course is skipped, the user should somehow be notified
  courses = courses.filter(course => {
    if (Object.keys(course).some(key => course[key] === null)) {
      console.warn(`Course '${course.name}' has fields with unknown values, so we are skipping it.`);
      return false;
    } else {
      return true;
    }
  });

  return courses;
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
  courses: [],
});


$input.addEventListener('input', () => {
  state.courses = getCourses();
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





