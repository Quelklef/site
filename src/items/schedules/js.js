document.addEventListener('DOMContentLoaded', function() {
'use scrict';

const { daysInWeek, shortenName, randomColor, el, tx, minBy, maxBy, hexToRgb } = window.Util;



// == Main == //

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

    updateSettings(sections);

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



// == Building Settings == //

const { makeObservable } = window.DeepObservables;

function bindInput(observableObject, observedProperty, inputElement) {
  observableObject.addObserver(observedProperty, v => inputElement.value = v);
  inputElement.addEventListener('input', e => observableObject[observedProperty] = e.target.value);
  inputElement.value = observableObject[observedProperty];
}

function bindElement(observableObject, observedProperty, element, mapper = x => x) {
  const update = () => element.innerHTML = mapper(observableObject[observedProperty]);
  observableObject.addObserver(observedProperty, update);
  update();
}


const settings = makeObservable({

  timeFormat: 'standard',

  cellWidth: 20,
  cellHeight: 30,

  weekend: 'none',

  sections: {
    // For each section there will be
    // [section.name]: {
    //   shortName: String,
    //   backgroundColor: String,
    //   textColor: String,
    // }
  },

});



let id = 0;
function nextId() { return id++; }

function updateSettings(sections) {
  settings.atomically(() => {
    for (const section of sections) {
      if (!(section.name in settings.sections)) {
        settings.sections[section.name] = {
          id              : nextId(),
          shortName       : shortenName(section.name),
          backgroundColor : randomColor(),
          textColor       : '#ffffff',
        };
      }
    }
  });
}



function createSettingsUI(sections) {

  const $UIcontainer = el('<div>');

  $UIcontainer.appendChild(el('<h2>Settings</h2>'));

  const $container = el('<div>');
  $container.style = `
    display: flex;
    justify-content: space-around;
    flex-wrap: wrap;
  `;
  $UIcontainer.appendChild($container)

  // -

  const $cellWidthSetting = el('<p>Cell width: </p>')
  const $cellWidthDisplay = el('<span style="font-family: monospace">')
  const $cellWidthField = el('<input type="range" min="1" max="50" />');

  bindInput(settings, 'cellWidth', $cellWidthField);
  bindElement(settings, 'cellWidth', $cellWidthDisplay, x => String(x).padStart(2, '0'));

  $cellWidthSetting.appendChild($cellWidthDisplay);
  $cellWidthSetting.appendChild(tx(' '));
  $cellWidthSetting.appendChild($cellWidthField);
  $cellWidthSetting.appendChild(tx(' '));
  $container.appendChild($cellWidthSetting);

  // -

  const $cellHeightSetting = el('<p>Cell height: </p>')
  const $cellHeightDisplay = el('<span style="font-family: monospace">')
  const $cellHeightField = el('<input type="range" min="1" max="50" />');

  bindInput(settings, 'cellHeight', $cellHeightField);
  bindElement(settings, 'cellHeight', $cellHeightDisplay, x => String(x).padStart(2, '0'));

  $cellHeightSetting.appendChild($cellHeightDisplay);
  $cellHeightSetting.appendChild(tx(' '));
  $cellHeightSetting.appendChild($cellHeightField);
  $cellHeightSetting.appendChild(tx(' '));
  $container.appendChild($cellHeightSetting);

  // -

  const $timeFormatSetting = el('<p>Time format: </p>');
  const $timeFormatField = el(`
  <select>
    <option value="standard">Standard</option>
    <option value="military">Military</option>
    <option value="colloquial">Colloquial</option>
  </select>
  `);
  bindInput(settings, 'timeFormat', $timeFormatField);
  $timeFormatSetting.appendChild($timeFormatField);
  $container.appendChild($timeFormatSetting);

  // -

  const $weekendSetting = el('<p>Weekend: </p>');
  const $weekendField = el(`
  <select>
    <option value="none">No weekend</option>
    <option value="prefix">Begin with weekend</option>
    <option value="suffix">End with weekend</option>
    <option value="split">Split weekend</option>
  </select>
  `);
  bindInput(settings, 'weekend', $weekendField);
  $weekendSetting.appendChild($weekendField);
  $container.appendChild($weekendSetting);

  // -

  for (const section of sections) {
    // Render new section
    const $settingsUI = createSectionSettingsUI(section);
    $UIcontainer.appendChild($settingsUI);
  }

  return $UIcontainer;

}


function createSectionSettingsUI(section) {
  const $container = el('<div>');
  $container.appendChild(el(`<h3>${section.name}</h3>`));

  const $settingsContainer = el('<div>');
  $settingsContainer.style = "display: flex; justify-content: space-between;";
  $container.appendChild($settingsContainer);

  const sectionSettings = settings.sections[section.name];

  const $shortNameSetting = el('<p>Name: </p>');
  const $shortNameField = el('<input type="text">');
  bindInput(sectionSettings, 'shortName', $shortNameField);
  $shortNameSetting.appendChild($shortNameField);
  $settingsContainer.appendChild($shortNameSetting);

  const $backgroundColorSetting = el('<p>Background: </p>')
  const $backgroundColorField = el('<input type="color" />');
  bindInput(sectionSettings, 'backgroundColor', $backgroundColorField);
  $backgroundColorSetting.appendChild($backgroundColorField);
  $settingsContainer.appendChild($backgroundColorSetting);

  const $textColorSetting = el('<p>Text: </p>');
  const $textColorField = el('<input type="color" />')
  bindInput(sectionSettings, 'textColor', $textColorField);
  $textColorSetting.appendChild($textColorField);
  $settingsContainer.appendChild($textColorSetting);

  return $container;
}



// == Building HTML == //

function createSchedule(sections) {
  const $container = el('<div class="schedule-container">');
  $container.style = "display: inline-block;"

  $container.appendChild(createScheduleTable(sections));
  $container.appendChild(createScheduleKey(sections));

  const style = createScheduleStyle(sections);
  $container.appendChild(el(`<style>${style}</style>`));

  return $container;
}

function createScheduleTable(sections) {

  const earliestSection = minBy(sections, sec => sec.startTime);
  const latestSection = maxBy(sections, sec => sec.endTime);

  const earliestTime = earliestSection.startTime;
  const latestTime = latestSection.endTime;

  // The bounds of our graph
  // TODO: bug if you set this to -40 and +40
  const startTime = earliestTime - 40;
  const endTime   = latestTime   + 40;

  // The size of our time blocks (in minutes)
  const timeStep = 10;

  // = Rendering = //

  const $container = el('<div>');

  const $schedule = el('<table id="schedule">');
  $container.appendChild($schedule);

  const $topRow = el('<tr>')
  $topRow.appendChild(el('<th>Day</th>'));
  for (let time = startTime; time <= endTime; time += timeStep) {
    if (time % 60 === 0) {
      // Full hour
      $topRow.appendChild(el(`<th class="siderule">${prettifyTime(time)}</th>`))
    } else {
      $topRow.appendChild(el(`<th>`));
    }
  }
  $schedule.appendChild($topRow);

  const dayTable = buildDayTable(sections, startTime, endTime);
  for (const day of getChosenDays()) {
    const $dayRow = el('<tr>');
    $dayRow.appendChild(el(`<th>${day}</th>`));

    // Running time of at the end of the previous block
    let previousEndTime = startTime;

    for (const block of dayTable[day]) {
      const columnSpan = Math.floor(block.length / timeStep);

      if (block.section !== null) {

        const section = block.section;
        const shortName = settings.sections[section.name].shortName;
        const id = settings.sections[section.name].id;
        const $td = el(`<td class="section-${id}" colspan=${columnSpan}>${shortName}</td>`);
        $td.style.backgroundColor = section.color;
        $dayRow.appendChild($td);

      } else {

        for (let i = 0; i < columnSpan; i++) {
          const time = previousEndTime + i * timeStep;
          if (time % 60 === 0) {
            $dayRow.appendChild(el(`<td class="siderule">`));
          } else {
            $dayRow.appendChild(el(`<td>`));
          }
        }

      }

      previousEndTime += block.length;
    }
    
    $schedule.append($dayRow);
  }

  return $container;
}

function getChosenDays() {
  switch(settings.weekend) {

    case 'none':
      return daysInWeek.slice(0, -2);

    case 'prefix':
      return daysInWeek.slice(-2).concat(daysInWeek.slice(0, -2));

    case 'suffix':
      return daysInWeek;

    case 'split':
      return daysInWeek.slice(-1).concat(daysInWeek.slice(0, -1));

    default:
      throw 'Uh oh';

  }
}

function createScheduleStyle(sections) {

  let style = `
.schedule-container {
  background: white;
  padding: 15px;
  font-family: serif;
  font-size: 14px;
}

table {
  border: 1px solid grey;
  border-collapse: collapse;
}

td {
  width: ${settings.cellWidth}px;
  padding: 0;
}

th {
  white-space: nowrap;
  padding: 0;
  padding-left: 5px;
}

tr:nth-child(2n+1) {
  background-color: rgb(240, 240, 240);
}

th:first-child {
  max-width: 100px;
  min-width: 100px;
  text-align: left;
}

td, th {
  width: ${settings.cellWidth}px;
  max-width: ${settings.cellWidth}px;
  height: ${settings.cellHeight}px;
  text-align: center;
}

.siderule {
  border-left: 1px dotted grey;
}
`;

  for (const section of sections) {
    const id = settings.sections[section.name].id;
    const backgroundColor = settings.sections[section.name].backgroundColor;
    const textColor = settings.sections[section.name].textColor;

    // We have to convert the hex color to RGB because hashtags fuck up the bookmark--
    // presumably because in the URL they're interpreted as an ID specifier
    style += `
.section-${id} {
  background-color: ${hexToRgb(backgroundColor)};
  color: ${hexToRgb(textColor)};
}
`;
  }

  return style;
}

function buildDayTable(sections, startTime, endTime) {
  // From a list of sections, e.g.
  //   [ { name: 'sec1', days: ['Monday']           , startTime: 600, endTime: 660 }
  //     { name: 'sec2', days: ['Monday', 'Tuesday'], startTime: 810, endTime: 870 } ]
  // and a start and end time, say,
  //   startTime = 600
  //   endTime = 900
  // build a table like e.g.
  //   {
  //     "Monday":  [ { length: 60 , section: { name: 'sec1', ... } },
  //                  { length: 150, section: null },
  //                  { length: 60 , section: { name: 'sec2', ... } },
  //                  { length: 90 , section: null } ],
  //
  //     "Tuesday": [ { length: 210, section: null },
  //                  { length: 60 , section: { name: 'sec2', ... } },
  //                  { length: 90 , section: null } ],
  //     ...
  //   }
  // which breaks the days into blocks, starting at startTime and
  // ending at endTime (inclusive).
  
  const dayTable = {};

  for (const day of daysInWeek) {
    dayTable[day] = [];
    const sectionsToday = (sections.filter(sec => sec.days.includes(day))
                                   .sort((a, b) => a.startTime - b.startTime));

    let time = startTime;
    for (const section of sectionsToday) {
      const delta = section.startTime - time;
      if (delta > 0) {
        dayTable[day].push({ length: delta, section: null });
      }

      const range = section.endTime - section.startTime;
      dayTable[day].push({ length: range, section: section });

      time = section.endTime;
    }

    if (time !== endTime) {
      dayTable[day].push({ length: endTime - time, section: null });
    }
  }

  return dayTable;
}

function prettifyTime(time) {
  const hour24 = Math.floor(time / 60);
  const minute = time % 60;

  const hour12 = hour24 > 12 ? hour24 - 12
               : hour24 === 0 ? 12
               : hour24;

  const hour24Pad = String(hour24).padStart(2, '0');
  const minutePad = String(minute).padStart(2, '0');
  const hour12Pad = String(hour12).padStart(2, '0');

  const suffix = hour24 < 12 ? 'AM' : 'PM';

  const words = { 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Eleven', 12: 'Twelve' };
  const hourWord = words[hour12];

  switch(settings.timeFormat) {

    case 'military':
      return `${hour24Pad}:${minutePad}`;
    break;

    case 'standard':
      return `${hour12Pad}:${minutePad}${suffix}`;
    break;

    case 'colloquial':
      if (hour24 === 12 && minute === 0) return 'Noon';
      if (hour24 === 0 && minute === 0) return 'Midnight';
      if (minute === 0) return `${hourWord} o'clock`;
      return `${hour12}:${minutePad}`;
    break;

    default: throw 'Uh oh';

  }

  if (settings.timeFormat === 'military') {
    suffix = '';
  } else if (settings.timeFormat === 'standard') {
  } else {
    throw 'Uh oh';
  }

}

function createScheduleKey(sections) {
  const $container = el('<div>');
  $container.style = `
    display: flex;
    justify-content: center;
    margin-top: 15px;
  `;

  for (const section of sections) {
    const sectionSettings = settings.sections[section.name];

    const $sectionKey = el(`<div>`);
    $sectionKey.style = `
      border: 1px solid ${sectionSettings.backgroundColor};
      margin: 0 7px;
    `;

    const $sectionName = el(`<p>${sectionSettings.shortName}</p>`)
    $sectionName.style = `
      text-align: center;
      padding: 2px 6px;
      margin: 0;
      background-color: ${sectionSettings.backgroundColor};
      color: ${sectionSettings.textColor};
    `;
    $sectionKey.appendChild($sectionName);

    const location = `${section.building} rm ${section.room}`;
    const $sectionLocation = el(`<p>${location}</p>`);
    $sectionLocation.style = `
      margin: 0;
      padding: 2px 6px;
    `;
    $sectionKey.appendChild($sectionLocation);

    $container.appendChild($sectionKey);
  }

  return $container;
}



// == Call main() == //

main();


});





