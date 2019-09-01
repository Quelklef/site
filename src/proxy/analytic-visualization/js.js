window.addEventListener('load', function() {

'use strict';

const dark = 'black';
const light = 'rgb(150, 150, 150)';
const verylight = 'rgb(230, 230, 230)';

const $dom = document.getElementById('domain');
const dom = $dom.getContext('2d');
const $cod = document.getElementById('codomain');
const cod = $cod.getContext('2d');

dom.imageSmoothingEnabled = false;
cod.imageSmoothingEnabled = false;

const $canvases = document.getElementById('canvases');
function resizeCanvases() {
  $dom.width = Math.floor($canvases.clientWidth / 3);
  $cod.width = Math.floor($canvases.clientWidth / 3 * 2);
  $dom.height = $cod.height = $dom.clientHeight;
}

resizeCanvases();
window.addEventListener('resize', resizeCanvases);

// Add some helper functions to canvases

const Ctx = CanvasRenderingContext2D;

Ctx.prototype.height = function() {
  return this.canvas.clientHeight;
}
Ctx.prototype.width = function() {
  return this.canvas.clientWidth;
}

Ctx.prototype.strokeCircle = function(x, y, rad) {
  this.beginPath();
  this.arc(x, y, rad, 0, 2 * Math.PI);
  this.stroke();
}

Ctx.prototype.fillCircle = function(x, y, rad) {
  this.beginPath();
  this.arc(x, y, rad, 0, 2 * Math.PI);
  this.fill();
}

Ctx.prototype.strokeLine = function(x0, y0, xf, yf) {
  this.beginPath();
  this.moveTo(x0, y0);
  this.lineTo(xf, yf);
  this.stroke();
}

Ctx.prototype.drawVertical = function(x, y) {
  this.strokeLine(x, 0, x, this.height());
}
Ctx.prototype.drawHorizontal = function(x, y) {
  this.strokeLine(0, y, this.width(), y);
}

Ctx.prototype.clear = function() {
  this.clearRect(0, 0, this.width(), this.height());
}

Ctx.prototype.inBounds = function(x, y) {
  return 0 <= x && x < this.width() && 0 <= y && y < this.height();
}


// Canvases will be drawn centered around a point 'ctx.center'
// It will be nice to be able to use the drawing API in terms of
// math coordinates rather than pixel coordinates, so we define
// a bunch of methods with trailing underscores to do that

// This converts a complex math coordinate to a pixel coordinate
Ctx.prototype.vis = function(z) {
  return [
    this.canvas.width / 2 + this.scale * (z.re - this.center.re),
    this.canvas.height / 2 + this.scale * (this.center.im - z.im)
  ];
}

// This converts a method of all pixel coordinates to a method
// of all math coordinates
function fromVisual(method) {
  return function(...args) {
    // TBH, not sure why I need `x => this.vis(x)` instead of just `this.vis`.
    // Presumably something to do with `this` scoping
    const newArgs = flatten(Array.from(args).map(x => this.vis(x)));
    return method.call(this, ...newArgs);
  }
}

function flatten(ar) { return [].concat.apply([], ar); }

Ctx.prototype.drawVertical_   = fromVisual(Ctx.prototype.drawVertical);
Ctx.prototype.drawHorizontal_ = fromVisual(Ctx.prototype.drawHorizontal);
Ctx.prototype.moveTo_         = fromVisual(Ctx.prototype.moveTo);
Ctx.prototype.lineTo_         = fromVisual(Ctx.prototype.lineTo);
Ctx.prototype.strokeLine_     = fromVisual(Ctx.prototype.strokeLine);
Ctx.prototype.inBounds_       = fromVisual(Ctx.prototype.inBounds);
Ctx.prototype.strokeCircle_   = function(z, r) { this.strokeCircle(...this.vis(z), r * this.scale); }
Ctx.prototype.fillCircle_     = function(z, r) { this.fillCircle(...this.vis(z), r * this.scale); }

// Return leftmost, uppermost, rightmost, and bottommost pixel cooredinates
Ctx.prototype.left_           = function() { return this.center.re - this.width() / 2; }
Ctx.prototype.right_          = function() { return this.center.re + this.width() / 2; }
Ctx.prototype.top_            = function() { return this.center.im - this.height() / 2; }
Ctx.prototype.bottom_         = function() { return this.center.im + this.height() / 2; }

function drawFunction(expr, z0, options) {
  // expr           : expression of z denoting function to draw
  // z0             : point around which to draw function
  // options        : dictionary with the following keys:
  //   precision      : precision of drawings, i.e., number of points in paths
  //   renderDistance : max manhattan distance from z0 to draw paths
  //   epsilon        : radius of neighborhood ball
  //   skip           : distance between gridlines

  const func = math.compile(expr);
  const w0 = math.complex(func.eval({z: z0}));
  const derivativeFunc = math.derivative(expr, 'z').compile();

  dom.center = z0;
  cod.center = w0;

  dom.scale = domScaleField.get();
  cod.scale = codScaleField.get();

  dom.clear();
  cod.clear();

  drawGrid(z0, w0, func, derivativeFunc, options);
  drawAxes(z0, w0, func, derivativeFunc, options);

  drawOneLabel(z0, w0, func, derivativeFunc, options);

  drawNeighborhood(z0, w0, func, derivativeFunc, options);
  drawPoints(z0, w0, func, derivativeFunc, options);
}

function drawLineImage(z0, zf, func, options) {
  // Given a starting z and a direction, draw the image of the designated line
  // Return `false` if all points were outsided the drawing bounds,
  //                or all points were within 0.5 of the center;
  // return `true` otherwise
  const tolerance = 0.5;

  let result = false;

  cod.beginPath();
  cod.moveTo_(func.eval({z: z0}));
  const dz = math.divide(math.subtract(zf, z0), options.precision);
  let prevPointDrawn = false;
  for (let i = 0; i < options.precision; i++) {
    const z = math.add(z0, math.multiply(i, dz));
    const w = math.complex(func.eval({z: z}));
    const inBounds_ = cod.inBounds_(w);
    if (inBounds_ && math.abs(w) > tolerance) result = true;

    // Skip drawing lines that are fully out-of-bounds or not novel
    if (inBounds_ || prevPointDrawn) {
      cod.lineTo_(w);
      prevPointDrawn = true;
    } else {
      cod.moveTo_(w);
    }
  }
  cod.stroke();

  return result;
}

function drawGrid(z0, w0, func, derivativeFunc, options) {
  // == domain == //
  const snappedX = Math.floor(z0.re / options.skip) * options.skip;
  const snappedY = Math.floor(z0.im / options.skip) * options.skip;

  const left = snappedX - options.renderDistance;
  const right = snappedX + options.renderDistance;
  const top = snappedY - options.renderDistance;
  const bottom = snappedY + options.renderDistance;

  // Draw grid
  dom.strokeStyle = cod.strokeStyle = verylight;
  for (let j = 0; j < options.renderDistance / options.skip; j++)
    dom.strokeLine_(math.complex(snappedX + j * options.skip, bottom), math.complex(snappedX + j * options.skip, top));
  for (let j = 0; j < options.renderDistance / options.skip; j++)
    dom.strokeLine_(math.complex(snappedX - j * options.skip, bottom), math.complex(snappedX - j * options.skip, top));
  for (let j = 0; j < options.renderDistance / options.skip; j++)
    dom.strokeLine_(math.complex(left, snappedY + j * options.skip), math.complex(right, snappedY + j * options.skip));
  for (let j = 0; j < options.renderDistance / options.skip; j++)
    dom.strokeLine_(math.complex(left, snappedY - j * options.skip), math.complex(right, snappedY - j * options.skip));

  // == codomain == //

  { // Draw verticals to the right of z0
    let _x = snappedX;
    while (drawLineImage(math.complex(_x, top), math.complex(_x, bottom), func, options)
      && _x - snappedX <= options.renderDistance)
      _x += options.skip;
  }

  { // Draw verticals to the left of z0
    let _x = snappedX;
    while (drawLineImage(math.complex(_x, top), math.complex(_x, bottom), func, options)
      && snappedX - _x <= options.renderDistance)
      _x -= options.skip;
  }

  { // Draw horizontals above z0
    let _y = snappedY;
    while (drawLineImage(math.complex(left, _y), math.complex(right, _y), func, options)
      && _y - snappedY <= options.renderDistance)
      _y += options.skip;
  }

  { // Draw horizontals below z0
    let _y = snappedY;
    while (drawLineImage(math.complex(left, _y), math.complex(right, _y), func, options)
      && snappedY - _y <= options.renderDistance)
      _y -= options.skip;
  }
}

function drawAxes(z0, w0, func, derivativeFunc, options) {
  dom.strokeStyle = cod.strokeStyle = dark;
  dom.drawVertical_(math.complex(0, 0));
  dom.drawHorizontal_(math.complex(0, 0));
  drawLineImage(math.complex(z0.re - options.renderDistance, 0), math.complex(z0.re + options.renderDistance, 0), func, options);
  drawLineImage(math.complex(0, z0.im - options.renderDistance), math.complex(0, z0.im + options.renderDistance), func, options);
}

function drawNeighborhood(z0, w0, func, derivativeFunc, options) {
  if (!derivativeFunc) return;
  const derivative = derivativeFunc.eval({z : z0});
  if (!derivative) return;
  const dilation = math.abs(derivative);
  
  // Draw concentric circles
  dom.strokeStyle = cod.strokeStyle = light;
  const circleCount = Math.floor(options.epsilon / 2 + 2);  // mostly an arbitrary formula
  for (let circle = 1; circle < circleCount; circle++) {
    dom.strokeCircle_(z0, circle / circleCount * options.epsilon);
    cod.strokeCircle_(w0, circle / circleCount * options.epsilon * dilation);
  }
  dom.strokeStyle = cod.strokeStyle = dark;
  dom.lineWidth = cod.lineWidth = 2;
  dom.strokeCircle_(z0, options.epsilon);
  cod.strokeCircle_(w0, options.epsilon * dilation);
  dom.lineWidth = cod.lineWidth = 1;
  
  // Draw arrows
  const N = math.complex(0, options.epsilon);
  const E = math.complex(options.epsilon, 0);
  const S = math.complex(0, -options.epsilon);
  const W = math.complex(-options.epsilon, 0);

  dom.strokeStyle = cod.strokeStyle = light;

  dom.strokeLine_(z0, math.add(z0, N));
  dom.strokeLine_(z0, math.add(z0, S));
  dom.strokeLine_(z0, math.add(z0, W));
  
  cod.strokeLine_(w0, math.add(w0, math.multiply(N, derivative)));
  cod.strokeLine_(w0, math.add(w0, math.multiply(S, derivative)));
  cod.strokeLine_(w0, math.add(w0, math.multiply(W, derivative)));
  
  dom.strokeStyle = cod.strokeStyle = dark;
  dom.lineWidth = cod.lineWidth = 3;
  dom.strokeLine_(z0, math.add(z0, E));
  cod.strokeLine_(w0, math.add(w0, math.multiply(E, derivative)));
  dom.lineWidth = cod.lineWidth = 1;
}

function drawOneLabel(z0, w0, func, derivativeFunc, options) {
  dom.fillStyle = "red";
  dom.font = "16px 'Comic Sans MS'";

  const pos = dom.vis(math.complex(options.skip, 0));
  dom.fillText(`${options.skip}`, pos[0], pos[1] - 5);
  const ptRad = 2;
  dom.fillCircle(...pos, ptRad);
}

function drawPoints(z0, w0, func, derivativeFunc, options) {
  const ptRad = 3;
  dom.fillStyle = cod.fillStyle = dark;
  dom.fillCircle(...dom.vis(z0), ptRad);
  cod.fillCircle(...cod.vis(w0), ptRad);
  
  dom.fillStyle = cod.fillStyle = "red";
  dom.font = cod.font = "16px 'Comic Sans MS'";
  const z0Text = math.round(z0, 4).toString();
  const z0_ = [dom.vis(z0)[0] + 5, dom.vis(z0)[1] - 5];
  const w0Text = math.round(w0, 4).toString();
  const w0_ = [cod.vis(w0)[0] + 5, cod.vis(w0)[1] - 5];
  dom.fillText(z0Text, ...z0_);
  cod.fillText(w0Text, ...w0_);
}

const z0Field             = fieldProxy(document.getElementById('z0'             ), s => math.complex(math.eval(s)), x => x.round(2).toString());
const exprField           = fieldProxy(document.getElementById('expression'     ), x => { math.parse(x); return x; });
const precisionField      = fieldProxy(document.getElementById('precision'      ), Number);
const renderDistanceField = fieldProxy(document.getElementById('render-distance'), Number);
const epsilonField        = fieldProxy(document.getElementById('epsilon'        ), Number);
const $domScale           = document.getElementById('domain-scale');
const domScaleField       = fieldProxy($domScale                                 , Number, x => Math.max(x, Number.MIN_VALUE));  // If let get to 0, cannot zoom back in
const $codScale           = document.getElementById('codomain-scale');
const codScaleField       = fieldProxy($codScale                                 , Number, x => Math.max(x, Number.MIN_VALUE));
const stepDistanceField   = fieldProxy(document.getElementById('step-distance'  ), Number);
const skipField           = fieldProxy(document.getElementById('skip'           ), Number);

function fieldProxy($el, parse, setterMap) {
  parse = parse || (x => x);
  setterMap = setterMap || (x => x);

  'change onchange keyup keypress onpaste mouseup mousewheel mousedown click'.split(' ').forEach(event =>
    $el.addEventListener(event, draw));

  const o = {
    _prevValue: $el.value,
    set: x => {
      o._prevValue = $el.value;
      $el.value = setterMap(x);
    },
    get: () => {
      try {
        return parse($el.value);
      } catch {
        return o._prevValue;
      }
    },
  };

  return o;
}

function draw() {
  drawFunction(
    exprField.get(),
    z0Field.get(),
    {
      precision: precisionField.get(),
      renderDistance: renderDistanceField.get(),
      epsilon: epsilonField.get(),
      skip: skipField.get(),
    },
  );
}

window.addEventListener('resize', x => draw(true));
draw();

document.addEventListener('keydown', function keyPressHandler(e) {
  // Don't do anything if focused on an input
  if (document.activeElement !== document.body) return;

  switch(e.key) {
    case 'ArrowRight':
      animateMovement(math.complex(stepDistanceField.get(), 0))
      e.preventDefault();
      break;
    
    case 'ArrowDown':
      animateMovement(math.complex(0, -stepDistanceField.get()))
      e.preventDefault();
      break;
    
    case 'ArrowLeft':
      animateMovement(math.complex(-stepDistanceField.get(), 0))
      e.preventDefault();
      break;
    
    case 'ArrowUp':
      animateMovement(math.complex(0, stepDistanceField.get()))
      e.preventDefault();
      break;
  }

});

function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

document.addEventListener('wheel', function scrollHandler(e) {
  if (document.activeElement !== document.body) return;

  const scaleScale = 2 * sigmoid(-e.deltaY / 500);
  if (e.path[0] === $dom)
    domScaleField.set(domScaleField.get() * scaleScale);
  else if (e.path[0] === $cod)
    codScaleField.set(codScaleField.get() * scaleScale);

  draw();
  e.preventDefault();
});

let interval;
function animateMovement(deltaZ) {
  clearInterval(interval);  // Stop existing animation
  const finalZ = math.add(z0Field.get(), deltaZ);
  
  const stepCount = Math.ceil(precisionField.get() / 3.5);
  const totalTime = 300; // ms
  
  let iterCount = 0;
  interval = setInterval(function() {
    if (iterCount === stepCount - 1) {
      // Last iteration
      z0Field.set(finalZ);
      draw();
      clearInterval(interval);
    } else {
      const stepsLeft = stepCount - iterCount;
      const step = math.divide(math.subtract(finalZ, z0Field.get()), stepsLeft);
      z0Field.set(math.add(z0Field.get(), step));
      draw();
    }
    iterCount++;
  }, totalTime / stepCount);
}

// https://stackoverflow.com/a/42111623/4608364
function relativeXY(e) {
  // Return the (x, y) coordinates of an event relative to the elemnt
  let rect = e.target.getBoundingClientRect();
  return [e.clientX - rect.left, e.clientY - rect.top];
}

let mouseDown = false;
let mouseFrom;
$dom.addEventListener('mousedown', function mouseDownHandler(e) {
  mouseDown = true;
  mouseFrom = math.complex(...relativeXY(e));
});

$dom.addEventListener('mousemove', function mouseMoveHandler(e) {
  if (!mouseDown) return;
  const mouseTo = math.complex(...relativeXY(e));
  const diff = math.divide(math.conj(math.subtract(mouseFrom, mouseTo)), domScaleField.get());
  z0Field.set(math.add(z0Field.get(), diff));
  mouseFrom = mouseTo;
  draw();
});

$dom.addEventListener('mouseup', () => mouseDown = false);
$dom.addEventListener('mouseleave', () => mouseDown = false)
  
});
