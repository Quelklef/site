(function() {
'use strict';

window.DeepObservables = {}


window.DeepObservables.makeObservable =
function makeObservable(object = {}) {
  /*
  Create and return a  deeply observable object. A deeply observable
  object is an object on which you can listen for attribute changes, as well
  changes in any children object attributes, or their children, etc.


  == Simple example ==

  A simple example:

    const person = createObservable({
      name: 'Cornelius',
    });

    person.addObserver('name'
      newName => console.log(`New name is ${newName}`));

    person.name = 'Rasmus';

  Will log 'New name is Rasmus' in console


  == Adding children objects ==

  Attributes set to objects will atuomatically also
  be made deeply observable:

    person.location = {
      address: '123 Main St',
      room: 'kitchen',
    }

    person.location.addObserver('room',
      newRoom => console.log(`Moved into the ${room}`));

    person.location.room = 'dining room'

  will log 'Moved into the dining room' in console


  == Propogation ==

  Modifications to a descendant object will bubble
  up into parent objects.

    person.addObserver('location', newLocation => ...)

  will be triggered by e.g.

    person.location.address = ...;


  == Observers with no target ==

  One may also add an observer to all properpties of
  an objecct by not passing a property to addObserver():

    person.addObserver(changedProperties => {
      // `changedProperties` is a list of properties changed
    });


  == Atomic changes ==

  Sometimes you want to make several changes to an object
  and notify the observers only after all changes are
  completed. This can be achieved with .atomically:

    const point = createObservable();
    point.x = ...;
    point.y = ...;
    point.addObserver('x', ...);
    point.addObserver('y', ...);

    point.atomically(() => {
      point.x = ...;  // Does not notify observers
      point.y = ...;  // Does not notify observers
    })
    // Now both observers are notified.

  */

  return _makeObservable(object);
}


function _makeObservable(target = {}, parent = null, propertyNameInParent = null) {
  const { ...props } = target;
  const observable = _newObservable(target, parent, propertyNameInParent);
  Object.assign(observable, props);
  return observable;
}


// Singleton symbol for use later
const AllProperties = Symbol("DeepObservables.AllProperties");

// Singleton symbol for safely storying information in target object
const Internal = Symbol("DeepObservables.Internal");

function _newObservable(target, parent, propertyNameInParent) {
  /* Create and return a new empty deeply observable object. */

  // We need to keep on the target without polluting
  // the property namespace or causing naming conflicts.
  // Hidden/private/internal attributes will go here, and
  // exposed/public/external attributes will be assigned to
  // the target object directly.
  target[Internal] = {};

  // { target: String, callback: Function }
  // where target is either AllProperties, to observe all
  // properties, or a string, to obsrve one property.
  target[Internal].observers = [],

  // Parent Proxy
  target[Internal].parent = parent,

  // Name of the property in the parent that this proxy corresponds to
  target[Internal].propertyNameInParent = propertyNameInParent,

  target.addObserver = function(...args) {
    if (args.length === 2) {
      const [targetProp, callback] = args;
      target[Internal].observers.push({ targetProp, callback });
    } else {
      const [callback] = args;
      target[Internal].observers.push({ targetProp: AllProperties, callback });
    }
  },

  // We are able to pause notifying observers
  target[Internal].notificationsPaused = false,

  // While notifications are paused, we will keep track of what
  // properties changed.
  target[Internal].propertyBacklog = new Set(),

  target.atomically = function(operation) {
    target[Internal].notificationsPaused = true;
    operation();
    target[Internal].notificationsPaused = false;

    if (target[Internal].propertyBacklog.size > 0) {
      target[Internal].notifyObservers(...target[Internal].propertyBacklog);
      target[Internal].propertyBacklog.clear()
    }
  };

  target[Internal].notifyObservers = function(...changedProps) {
    // Notify all the observers who are listening to any of the changed properties

    if (target[Internal].notificationsPaused) {
      // Add the props to the backlog
      changedProps.forEach(p => target[Internal].propertyBacklog.add(p));
      return;
    }

    for (const { targetProp, callback } of target[Internal].observers) {
      if (targetProp === AllProperties) {
        callback(changedProps);
      } else if (changedProps.includes(targetProp)) {
        callback(target[targetProp]);
      }
    }

    // Propogate notification
    if (target[Internal].parent !== null) {
      target[Internal].parent[Internal].notifyObservers(target[Internal].propertyNameInParent);
    }
  };


  const handler = {
    set: function(target, property, newValue) {

      // Make all child objects also deeply observable
      if (typeof newValue === 'object' && newValue !== null) {
        newValue = _makeObservable(newValue, target, property);
      }

      target[property] = newValue;
      target[Internal].notifyObservers(property);

      return true;  // Yes, we successfully set the attribute

    }
  };

  return new Proxy(target, handler)
  
}




})();
