(function() {
'use strict';

window.Util = {};


const stringBetween =
window.Util.stringBetween =
function stringBetween(string, prefix, suffix) {
  // Return the text between `prefix` and `suffix`
  // Does not include prefix or suffix
  // There must be only one occurance of both `prefix` and
  // `suffix` in the given string.
  const [before, rest] = string.split(prefix);
  const [content, after] = rest.split(suffix);
  return content;
}


const skipLines =
window.Util.skipLines =
function skipLines(text, n) {
  // Skip n liens
  return text.split('\n').slice(n).join('\n');
}


const isLowerCase =
window.Util.isLowerCase =
function isLowerCase(text) {
  return text.toLowerCase() === text;
}


// from https://stackoverflow.com/a/35385518/4608364
const el =
window.Util.el =
function el(html) {
  /* Parse a single element */
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstChild;
}

const tx =
window.Util.tx =
function tx(text) {
  return document.createTextNode(text);
}


// Modified from https://stackoverflow.com/a/5092872/4608364
const randomColor =
window.Util.randomColor =
function randomColor() {
  return "#xxxxxx".replace(/x/g,()=>(~~(Math.random()*16)).toString(16));
}


const shortenName =
window.Util.shortenName =
function shortenName(name) {
  // e.g. shortenName("John Smith") -> "JohSmi"
  return (name
              .split(' ')
 
              // Remove stuff like 'and' in 'Exploration and Discovery'
              // Test for !isLowerCase. Don't test for isUpperCase.
              // The reason for this is that unexpected input or other languages
              //   will pass !isLowerCase but will NOT pass isUpperCase.
              // So, for instance, any course name with name in Chinese characters would
              //   get entirely stripped if we tested for isUpperCase, but will
              //   be entirely preserved if we use !isLowerCase.
              .filter(word => !isLowerCase(word))
 
              // Take the first 3 letters of each word
              .map(word => word.slice(0, 3))
 
              .join(''));
}


const minBy =
window.Util.minBy =
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


const maxBy =
window.Util.maxBy =
function maxBy(array, key) {
  return minBy(array, x => -key(x));
}


const hexToRgb =
window.Util.hexToRgb =
function hexToRgb(hex) {
  // Derived from https://stackoverflow.com/a/5624139/4608364
  const xs = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return `rgb(${xs.slice(1).map(x=>parseInt(x,16)).join(',')})`;
}


const daysInWeek =
window.Util.daysInWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];


})();
