(function() {
'use strict';

const { daysInWeek } = window.Util;

window.Parsing = {};


const parseSections =
window.Parsing.parseSections =
function parseSections(pasted) {
  // Given text pasted from WebAdvisor, parse the text into information about sections
  // Return value in form
  //   { name, days, startTime, endTime, building, room };
  // where
  //   name      : string
  //   days      : list of strings, or "Unknown" if unknown
  //   startTime : in minutes
  //   endTime   : in minutes
  //   building  : string
  //   room      : integer

  const sections = [];

  while (pasted !== '') {
    let section;
    [section, pasted] = parseSection(pasted);
    sections.push(section);
  }

  return sections;
}

function parseSection(sectionString) {

  function indexOf(string, subString) {
    if (!string.includes(subString)) {
      throw new Error("Parsing failed");
    }
    return string.indexOf(subString);
  }

  let name;
  {
    const chunk = sectionString.slice(indexOf(sectionString, ')') + 2);
    name = chunk.slice(0, indexOf(chunk, '\n'));
  }

  let days;
  {
    const chunk_ = sectionString.slice(sectionString.indexOf(') '));
    const chunk = chunk_.split('\n').slice(0, 2).join('\n');

    if (chunk.includes('Days to be Announced')) {
      console.warn(`Class '${name}' does not have known days.`);
      days = null;
    } else {
      days = daysInWeek.filter(d => chunk.includes(d));
    }

  }

  let startTime;
  let endTime;
  {
    const chunk_ = sectionString.slice(indexOf(sectionString, ') '));
    const chunk = chunk_.split('\n').slice(0, 2).join('\n');

    if (chunk.includes('Times to be Announced')) {
      console.warn(`Class '${name}' does not have known times.`);
      startTime = null;
      endTime = null;
    } else {
      const i = indexOf(chunk, ' - ');
      startTimeString = chunk.slice(i - "00:00AM".length, i);
      endTimeString = chunk.slice(i + 3, i + 3 + "00:00AM".length);

      startTime = parseTime(startTimeString);
      endTime = parseTime(endTimeString);
    }
  }

  let building;
  {
    const chunk__ = sectionString.slice(indexOf(sectionString, ') '));
    const chunk_ = chunk__.split('\n').slice(0, 2).join('\n');
    if (chunk_.includes('Times to be Announced')) {
      const chunk = chunk_.slice(indexOf(chunk_, 'Times to be Announced') + 'Times to be Announced'.length);
      building = chunk.split(',')[0];
    } else {
      const chunk = chunk_.slice(indexOf(chunk_, ' - '));
      building = chunk.split(', ')[1];
    }
  }

  let room;
  {
    const chunk = sectionString.slice(indexOf(sectionString, ', Room '));
    room = chunk.slice(', Room '.length, indexOf(chunk, '\n'));
  }

  let leftover;
  {
    leftover = sectionString.slice(indexOf(sectionString, ', Room ') + ', Room '.length);

    if (!leftover.includes(')')) {
      // If there are no more sections, set leftover to empty string
      leftover = '';
    }

    if (leftover === sectionString) throw 'Leftover is same :(';
  }

  const section = { name, days, startTime, endTime, building, room };
  return [section, leftover];
}

function parseTime(time) {
  // Return number of minutes
  // e.g. parseTime("01:30PM") -> 810

  const suffix = time.slice(-2);
  time = time.slice(0, -2);

  let [hour, minute] = time.split(':');
  hour = parseInt(hour, 10);
  minute = parseInt(minute, 10);

  if (suffix.toUpperCase() === 'PM' && hour !== 12) {
    hour += 12;
  }

  return 60 * hour + minute;
}


})();
