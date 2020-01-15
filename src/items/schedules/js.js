document.addEventListener('DOMContentLoaded', function() {
'use scrict';



// == Util == //

function stringBetween(string, prefix, suffix) {
  // Return the text between `prefix` and `suffix`
  // Does not include prefix or suffix
  // There must be only one occurance of both `prefix` and
  // `suffix` in the given string.
  const [before, rest] = string.split(prefix);
  const [content, after] = rest.split(suffix);
  return content;
}

function skipLines(text, n) {
  // Skip n liens
  return text.split('\n').slice(n).join('\n');
}

function isLowerCase(text) {
  return text.toLowerCase() === text;
}

// from https://stackoverflow.com/a/35385518/4608364
function el(html) {
  /* Parse a single element */
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstChild;
}

function tx(text) {
  return document.createTextNode(text);
}

function randomColor() {
  // https://stackoverflow.com/a/55346027/4608364
  return "#xxxxxx".replace(/x/g, y=>(Math.random()*16|0).toString(16));
}

function shortenName(name) {
  // e.g. shortenName("John Smith") -> "JohSmi"
  return (name
              .split(' ')
 
              // Remove stuff like 'and' in 'Exploration and Discovery'
              // Test for !isLowerCase. Don't test for isUpperCase.
              // The reason for this is that unexpected input or other languages
              //   will pass !isLowerCase but will NOT pass isUpperCase.
              // So, for instance, any class with name in Chinese characters would
              //   get entirely stripped if we tested for isUpperCase, but will
              //   be entirely preserved if we use !isLowerCase.
              .filter(word => !isLowerCase(word))
 
              // Take the first 3 letters of each word
              .map(word => word.slice(0, 3))
 
              .join(''));
}

function minBy(array, key) {
  // e.g. minBy([ [1], [1, 2, 3], [], [3], ], ar => ar.length) -> []
  let minEl = null;
  let minVal = Infinity;
  for (const el of array) {
    const val = key(el);
    if (val < minVal) {
      minEl = el;
      minVal = val;
    }
  }
  return minEl;
}

function maxBy(array, key) {
  return minBy(array, x => -key(x));
}




// == Box == //

class Box {
  constructor(value) {
    this._value = value;
    this.observers = [];
  }

  get value() {
    return this._value;
  }

  set value(newValue) {
    if (this._value !== newValue) {
      this._value = newValue;
      this.observers.forEach(callback => callback(this._value));
    }
  }

  listen(callback) {
    this.observers.push(callback);
    return this;
  }

  listenGet(callback) {
    this.listen(callback);
    callback(this.value);
  }
}

function bind(input, box) {
  // Bind an input element to a box

  const toInput = () => input.value = box.value;
  const toBox = () => box.value = input.value;

  input.addEventListener('input', toBox);
  box.listen(toInput);

  toInput();
}


// == Main == //

const $input = document.getElementById('input');
const $output = document.getElementById('output');
const $settings = document.getElementById('settings');

function main() {

  input.addEventListener('input', () => renderSchedule());

  function renderSchedule() {
    const text = $input.value;

    const sections = parseSections(text);
    updateSettings(sections);

    updateSettingsUI(sections);

    const schedule = createSchedule(sections);
    $output.innerHTML = '';
    $output.appendChild(schedule);
  };

  onSettingsChange(() => renderSchedule());

  // TODO: REMOVE -- TESTING ONLY
  renderSchedule();

}



// == Building Settings == //

const settings = {};

const settingsObservers = [];

function onSettingsChange(callback) {
  settingsObservers.push(callback);
}

function reportSettingsChanged() {
  settingsObservers.forEach(k => k(settings));
}

// Default settings

settings.cellWidth = new Box(20);
settings.cellWidth.listen(reportSettingsChanged);

settings.sections = {
  // For each section there will be
  // [section.name]: {
  //   shortName: Box(String),
  //   backgroundColor: Box(String),
  //   textColor: Box(String),
  // }
};

function updateSettings(sections) {
  for (const section of sections) {
    if (!(section.name in settings.sections)) {
      settings.sections[section.name] = {

        shortName       : new Box(shortenName(section.name)).listen(reportSettingsChanged),
        backgroundColor : new Box(randomColor())            .listen(reportSettingsChanged),
        textColor       : new Box('black')                  .listen(reportSettingsChanged),

      };
    }
  }
}



let cellWidthSettingRendered = false;

// Map section name to rendered element
const renderedSections = {};

function updateSettingsUI(sections) {

  if (!cellWidthSettingRendered) {
    cellWidthSettingRendered = true;
    const $cellWidthSetting = el('<p>Cell width: </p>')
    const $cellWidthField = el('<input type="range" min="1" max="50" />');
    const $cellWidthDisplay = el('<span>')
    settings.cellWidth.listenGet(v => $cellWidthDisplay.innerHTML = v);
    bind($cellWidthField, settings.cellWidth);
    $cellWidthSetting.appendChild($cellWidthField);
    $cellWidthSetting.appendChild($cellWidthDisplay);
    $settings.appendChild($cellWidthSetting);
  }

  for (const section of sections) {
    if (!(section.name in renderedSections)) {
      // Render new section
      const $settingsUI = createSectionSettingsUI(section);
      renderedSections[section.name] = $settingsUI;
      $settings.appendChild($settingsUI);
    }
  }

  for (const sectionName in renderedSections) {
    const shouldBeRemoved = sections.every(s => s.name !== sectionName);
    if (shouldBeRemoved) {
      // Remove outdated section
      renderedSections[sectionName].remove();
    }
  }

}


function createSectionSettingsUI(section) {
  const $container = el('<div>');

  $container.appendChild(el(`<h3>${section.name}</h3>`));

  const sectionSettings = settings.sections[section.name];

  const $shortNameSetting = el('<p>Short name: </p>');
  const $shortNameField = el('<input type="text">');
  bind($shortNameField, sectionSettings.shortName);
  $shortNameSetting.appendChild($shortNameField);
  $container.appendChild($shortNameSetting);

  const $backgroundColorSetting = el('<p>Background color: </p>')
  const $backgroundColorField = el('<input type="color" />');
  bind($backgroundColorField, sectionSettings.backgroundColor);
  $backgroundColorSetting.appendChild($backgroundColorField);
  $container.appendChild($backgroundColorSetting);

  const $textColorSetting = el('<p>Text color: </p>');
  const $textColorField = el('<input type="color" />')
  bind($textColorField, sectionSettings.textColor);
  $textColorSetting.appendChild($textColorField);
  $container.appendChild($textColorSetting);

  return $container;
}



// == Building HTML == //

function createSchedule(sections) {

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

  // Cell width
  const cellWidth = settings.cellWidth.value;

  // = Rendering = //

  const $schedule = el('<table id="schedule">');

  const $topRow = el('<tr>')
  $topRow.appendChild(el('<th>Day</th>'));
  for (let time = startTime; time <= endTime; time += timeStep) {
    if (time % 60 === 0) {
      // Full hour
      $topRow.appendChild(el(`<th style="max-width: ${cellWidth}px" class="siderule">${prettifyTime(time)}</th>`))
    } else {
      $topRow.appendChild(el(`<th style="width: ${cellWidth}px">`));
    }
  }
  $schedule.appendChild($topRow);

  const dayTable = buildDayTable(sections, startTime, endTime);
  for (const day of daysInWeek) {
    const $dayRow = el('<tr>');
    $dayRow.appendChild(el(`<th>${day}</th>`));

    // Running time of at the end of the previous block
    let previousEndTime = 0;

    for (const block of dayTable[day]) {
      const columnSpan = Math.floor(block.length / timeStep);

      if (block.section !== null) {

        const section = block.section;

        const shortName = settings.sections[section.name].shortName.value;
        const backgroundColor = settings.sections[section.name].backgroundColor.value;
        const $td = el(`<td style="background-color: ${backgroundColor}" colspan=${columnSpan}>${shortName}</td>`);
        $td.style.backgroundColor = section.color;
        $dayRow.appendChild($td);

      } else {

        for (let i = 0; i < columnSpan; i++) {
          const time = previousEndTime + i * timeStep;
          if (time % 60 === 0) {
            $dayRow.appendChild(el(`<td style="width: ${cellWidth}px" class="siderule">`));
          } else {
            $dayRow.appendChild(el(`<td style="width: ${cellWidth}px">`));
          }
        }

      }

      previousEndTime += block.length;
    }
    
    $schedule.append($dayRow);
  }

  return $schedule;
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
  const hour = Math.floor(time / 60);
  const minute = time % 60;

  const suffix = hour < 12 ? 'AM' : 'PM';
  const hourStr = hour > 12 ? String(hour - 12) : String(hour);
  const minuteStr = String(minute).padStart(2, '0');
  return `${hourStr}:${minuteStr}${suffix}`;
}



// == Parsing == //

function parseSections(pasted) {
  // Given text pasted from WebAdvisor, parse the text into information about sections

  let preferredSectionsString = stringBetween(
    pasted,
    "Preferred Sections",
    "Current Registrations",
  );
  preferredSectionsString = skipLines(preferredSectionsString, 4);
    
  let currentSectionsString = stringBetween(
    pasted,
    "Current Registrations",
    "If one of my choices is not available",
  );
  currentSectionsString = skipLines(currentSectionsString, 4);

  const sectionsStrings = [].concat(
    preferredSectionsString.split('\n\n\n'),
    currentSectionsString.split('\n\n\n')
  );

  return sectionsStrings.map(parseSection); 
}

const daysInWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function parseSection(sectionString) {
  const primaryInfo = sectionString.split('\n\n')[1];
  const [nameInfo, timeAndLoc] = primaryInfo.split('\n');

  const name = nameInfo.slice(nameInfo.indexOf(') ') + 2);
  const days = daysInWeek.filter(day => timeAndLoc.includes(day));
  let [startTime, endTime] = timeAndLoc.split(', ').slice(-3)[0].split(' ').slice(1).join(' ').split(' - ');
  startTime = parseTime(startTime);
  endTime = parseTime(endTime);
  const building = timeAndLoc.split(', ').slice(-2)[0];
  const room = parseInt(timeAndLoc.split(', ').slice(-1)[0].replace('Room ', ''), 10);

  const section = { name, days, startTime, endTime, building, room };

  return section;
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





// == Call main() == //

main();


});





