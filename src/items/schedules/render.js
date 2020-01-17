(function() {
'use strict';

const { settings } = window.Settings;
const { el, tx, minBy, maxBy, hexToRgb, daysInWeek } = window.Util;

window.Render = {};


function bindInput(observableObject, observedProperty, inputElement) {
  // Bind an input two-way to an observable object
  observableObject.addObserver(observedProperty, v => inputElement.value = v);
  inputElement.addEventListener('input', e => observableObject[observedProperty] = e.target.value);
  inputElement.value = observableObject[observedProperty];
}


function bindElement(observableObject, observedProperty, element, mapper = x => x) {
  // Bind an observable object one-way onto an element's innerHTML
  const update = () => element.innerHTML = mapper(observableObject[observedProperty]);
  observableObject.addObserver(observedProperty, update);
  update();
}


// == Rendering Settings == //

const createSettingsUI =
window.Render.createSettingsUI =
function createSettingsUI(courses) {
  /* Create a UI for editing settings */

  const $container = el('<div>');
  $container.appendChild(el('<h2>Settings</h2>'));

  const $globalSettings = createGlobalSettingsUI(courses);
  $container.appendChild($globalSettings);

  const $courseSettings = createCoursesSettingsUI(courses);
  $container.appendChild($courseSettings);

  return $container;
}


function createGlobalSettingsUI(courses) {
  /* Create a UI for editing global settings */

  const $container = el('<div>');
  $container.style = `
    display: flex;
    justify-content: space-around;
    flex-wrap: wrap;
  `;

  // == Cell width

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

  // == Cell height

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

  // == Time format

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

  // == Wekkends

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

  return $container;
}


function createCoursesSettingsUI(courses) {
  /* Create a UI for editing course settings */

  const $container = el('<div>');
  for (const course of courses) {
    const $courseSettingsUI = createCourseSettingsUI(course);
    $container.appendChild($courseSettingsUI);
  }
  return $container;
}


function createCourseSettingsUI(course) {
  /* Create UI for editing settings for a particular course */

  const $container = el('<div>');
  $container.appendChild(el(`<h3>${course.name}</h3>`));

  const $settingsContainer = el('<div>');
  $settingsContainer.style = "display: flex; justify-content: space-between;";
  $container.appendChild($settingsContainer);

  const courseSettings = settings.courses[course.name];

  const $shortNameSetting = el('<p>Name: </p>');
  const $shortNameField = el('<input type="text">');
  bindInput(courseSettings, 'shortName', $shortNameField);
  $shortNameSetting.appendChild($shortNameField);
  $settingsContainer.appendChild($shortNameSetting);

  const $backgroundColorSetting = el('<p>Background: </p>')
  const $backgroundColorField = el('<input type="color" />');
  bindInput(courseSettings, 'backgroundColor', $backgroundColorField);
  $backgroundColorSetting.appendChild($backgroundColorField);
  $settingsContainer.appendChild($backgroundColorSetting);

  const $textColorSetting = el('<p>Text: </p>');
  const $textColorField = el('<input type="color" />')
  bindInput(courseSettings, 'textColor', $textColorField);
  $textColorSetting.appendChild($textColorField);
  $settingsContainer.appendChild($textColorSetting);

  return $container;
}



// == Rendering Schedule == //


const renderSchedule =
window.Render.renderSchedule =
function renderSchedule(courses) {
  const $container = el('<div class="schedule-container">');
  $container.style = "display: inline-block;"

  $container.appendChild(renderScheduleTable(courses));
  $container.appendChild(renderScheduleKey(courses));

  const style = renderScheduleStyle(courses);
  $container.appendChild(el(`<style>${style}</style>`));

  return $container;
}


function renderScheduleTable(courses) {

  const earliestCourse = minBy(courses, c => c.startTime);
  const latestCourse = maxBy(courses, c => c.endTime);

  const earliestTime = earliestCourse.startTime;
  const latestTime = latestCourse.endTime;

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

  const dayTable = buildDayTable(courses, startTime, endTime);
  for (const day of getChosenDays()) {
    const $dayRow = el('<tr>');
    $dayRow.appendChild(el(`<th>${day}</th>`));

    // Running time of at the end of the previous block
    let previousEndTime = startTime;

    for (const block of dayTable[day]) {
      const columnSpan = Math.floor(block.length / timeStep);

      if (block.course !== null) {

        const course = block.course;
        const shortName = settings.courses[course.name].shortName;
        const id = settings.courses[course.name].id;
        const $td = el(`<td class="course-${id}" colspan=${columnSpan}>${shortName}</td>`);
        $td.style.backgroundColor = course.color;
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


function renderScheduleStyle(courses) {

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

  for (const course of courses) {
    const id = settings.courses[course.name].id;
    const backgroundColor = settings.courses[course.name].backgroundColor;
    const textColor = settings.courses[course.name].textColor;

    // We have to convert the hex color to RGB because hashtags fuck up the bookmark--
    // presumably because in the URL they're interpreted as an ID specifier
    style += `
.course-${id} {
  background-color: ${hexToRgb(backgroundColor)};
  color: ${hexToRgb(textColor)};
}
`;
  }

  return style;
}


function buildDayTable(courses, startTime, endTime) {
  // From a list of courses, e.g.
  //   [ { name: 'sec1', days: ['Monday']           , startTime: 600, endTime: 660 }
  //     { name: 'sec2', days: ['Monday', 'Tuesday'], startTime: 810, endTime: 870 } ]
  // and a start and end time, say,
  //   startTime = 600
  //   endTime = 900
  // build a table like e.g.
  //   {
  //     "Monday":  [ { length: 60 , course: { name: 'sec1', ... } },
  //                  { length: 150, course: null },
  //                  { length: 60 , course: { name: 'sec2', ... } },
  //                  { length: 90 , course: null } ],
  //
  //     "Tuesday": [ { length: 210, course: null },
  //                  { length: 60 , course: { name: 'sec2', ... } },
  //                  { length: 90 , course: null } ],
  //     ...
  //   }
  // which breaks the days into blocks, starting at startTime and
  // ending at endTime (inclusive).

  const dayTable = {};

  for (const day of daysInWeek) {
    dayTable[day] = [];
    const coursesToday = (courses.filter(sec => sec.days.includes(day))
                                   .sort((a, b) => a.startTime - b.startTime));

    let time = startTime;
    for (const course of coursesToday) {
      const delta = course.startTime - time;
      if (delta > 0) {
        dayTable[day].push({ length: delta, course: null });
      }

      const range = course.endTime - course.startTime;
      dayTable[day].push({ length: range, course: course });

      time = course.endTime;
    }

    if (time !== endTime) {
      dayTable[day].push({ length: endTime - time, course: null });
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


function renderScheduleKey(courses) {
  const $container = el('<div>');
  $container.style = `
    display: flex;
    justify-content: center;
    margin-top: 15px;
  `;

  for (const course of courses) {
    const courseSettings = settings.courses[course.name];

    const $courseKey = el(`<div>`);
    $courseKey.style = `
      border: 1px solid ${courseSettings.backgroundColor};
      margin: 0 7px;
    `;
    $container.appendChild($courseKey);

    const $courseName = el(`<p>${courseSettings.shortName}</p>`);
    $courseName.style = `
      text-align: center;
      padding: 2px 6px;
      margin: 0;
      background-color: ${courseSettings.backgroundColor};
      color: ${courseSettings.textColor};
    `;
    $courseKey.appendChild($courseName);

    const location = `${course.building} rm ${course.room}`;
    const $courseLocation = el(`<p>${location}</p>`);
    $courseLocation.style = `
      margin: 0;
      padding: 2px 6px;
    `;
    $courseKey.appendChild($courseLocation);
  }

  return $container;
}




})();
