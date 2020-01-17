(function() {
'use strict';


function makeProxyBut(target, handler, object) {
  /* Make a proxy with the given target and handler
  but also assign all the stuff from `object` onto the proxy.
  */
  const proxyHandler = {};
  const proxy = new Proxy(target, proxyHandler);
  Object.assign(proxy, object);
  Object.assign(proxyHandler, handler);
  return proxy;
}


window.DeepObservables = {};

const newObservable =
window.DeepObservables.newObservable =
function newObservable(parent = null, propertyNameInParent = null) {
  /*
  Create and return an empty deeply observable object. A deeply observable
  object is an object on which you can listen for attribute changes, as well
  changes in any children object attributes, or their children, etc.


  == Simple example ==

  A simple example:

    const person = newObservable();

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

    const point = newObservable({});
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

  // Target object for Proxy
  const proxyTarget = {};

  // Singleton symbol for use later
  const AllProperties = Symbol();

  const proxy = {

    // { proxyTarget: String, callback: Function }
    // where proxyTarget is either AllProperties, to observe all
    // properties, or a string, to obsrve one property.
    observers: [],

    // Parent Proxy
    parent: parent,

    // Name of the property in the parent that this proxy corresponds to
    propertyNameInParent: propertyNameInParent,

    addObserver: function(...args) {
      if (args.length === 2) {
        const [targetProp, callback] = args;
        proxy.observers.push({ targetProp, callback });
      } else {
        const [callback] = args;
        proxy.observers.push({ targetProp: AllProperties, callback });
      }
    },

    atomically: function(operation) {
      proxy.notificationsPaused = true;
      operation();
      proxy.notificationsPaused = false;

      if (proxy.propertyBacklog.size > 0) {
        proxy.notifyObservers(...proxy.propertyBacklog);
        proxy.propertyBacklog.clear()
      }
    },

    // We are able to pause notifying observers
    notificationsPaused: false,

    // While notifications are paused, we will keep track of what
    // properties changed.
    propertyBacklog: new Set(),

    notifyObservers: function(...changedProps) {
      // Fire all the callbacks who are listening
      // to any of the changed properties

      if (proxy.notificationsPaused) {
        // Add the props to the backlog
        changedProps.forEach(p => proxy.propertyBacklog.add(p));
        return;
      }

      for (const { targetProp, callback } of proxy.observers) {
        if (targetProp === AllProperties) {
          callback(changedProps);
        } else if (changedProps.includes(targetProp)) {
          callback(proxyTarget[targetProp]);
        }
      }

      // Propogate notification
      if (proxy.parent !== null) {
        proxy.parent.notifyObservers(proxy.propertyNameInParent);
      }
    },

  };


  // Now turn the proxy into an actual Proxy object

  const handler = {
    set: function(proxyTarget, property, newValue) {

      // Make all child objects also deeply observable
      if (typeof newValue === 'object' && newValue !== null) {
        newValue = makeObservable(newValue, proxy, property);
      }

      proxyTarget[property] = newValue;

      proxyTarget.notifyObservers(property);

      return true;

    }

  };

  return makeProxyBut(proxyTarget, handler, proxy)
  
}


const makeObservable =
window.DeepObservables.makeObservable =
function makeObservable(proxyTarget, parent, propertyNameInParent) {
  /* Turn an existing object into a deeply observable object */
  const observable = newObservable(parent, propertyNameInParent);
  Object.assign(observable, proxyTarget);
  return observable;
}


})();
