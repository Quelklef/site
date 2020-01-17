document.addEventListener('DOMContentLoaded', function() {
'use scrict';

const { el, tx  } = window.Util;
const { settings, prepareSettings } = window.Settings;
const { createSchedule, createSettingsUI } = window.Render;


const $input    = document.getElementById('input');
const $output   = document.getElementById('output');
const $settings = document.getElementById('settings');
const $bookmark = document.getElementById('bookmark');

function main() {

  let sections;

  input.addEventListener('input', () => {
    getSections();
    renderSchedule();
  });

  function getSections() {
    const text = $input.value;
    sections = window.Parsing.parseCourses(text);

    // TODO: If a section is skipped, the user should somehow be notified
    sections = sections.filter(section => {
      if (Object.keys(section).some(key => section[key] === null)) {
        console.warn(`Section '${section.name}' has fields with unknown values, so we are skipping it.`);
        return false;
      } else {
        return true;
      }
    });

    prepareSettings(sections);

    const $settingsUI = createSettingsUI(sections);
    $settings.innerHTML = '';
    $settings.appendChild($settingsUI);
  }

  function renderSchedule() {
    const $schedule = createSchedule(sections);
    $output.innerHTML = '';

    document.getElementById('output-title').innerHTML = 'Schedule';
    const $shadowContainer = el('<div>');
    $output.appendChild($shadowContainer);

    const $shadowRoot = $shadowContainer.attachShadow({ mode: 'open' });
    $shadowRoot.appendChild($schedule);

    $bookmark.innerHTML = '';
    $bookmark.appendChild(el('<h2>Bookmark</h2>'));
    $bookmark.appendChild(el(`<p>When you're happy with your schedule, you can save it by dragging the following link to your bookmark bar:</p>`));

    // Note that this does not transmit hex color codes properly:
    const html = '<title>Semester Schedule</title>' + encodeURI($schedule.outerHTML);
    $bookmark.appendChild(el(`<a href="data:text/html, ${html}">Semester schedule</a>`));
  }

  settings.addObserver(() => renderSchedule());

}



// == Call main() == //

main();


});





