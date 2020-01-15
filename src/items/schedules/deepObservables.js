(function() {
'use strict';

/*

Implements 'deep observables', which are objects
which are observable and whose descendants are automatically
also observable.

*/


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
  // Return a deeply observable object

  const target = {};

  const proxy = {

    // { isDeep: Boolean, observedProperty: String, callback: Function }
    // isDeep should be true if and only if observedProperty is null
    observers: [],

    // Parent proxy
    parent: parent,

    // Name of the property in the parent that this proxy corresponds to
    propertyNameInParent: propertyNameInParent,

    addObserver: function(observedProperty, callback) {
      proxy.observers.push({ isDeep: false, observedProperty, callback });
    },

    addDeepObserver: function(callback) {
      proxy.observers.push({ isDeep: true, callback });
    },

    atomically: function(operation) {
      // Do an operation "atomically", such that no observers
      // will be notified of anything until the operation completes.

      proxy.notificationsPaused = true;
      proxy.propertyBacklog.clear()

      operation();

      proxy.notificationsPaused = false;
      if (proxy.propertyBacklog.size > 0) {
        proxy.notifyObservers(...proxy.propertyBacklog);
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

      for (const { isDeep, observedProperty, callback } of proxy.observers) {
        if (isDeep) {
          callback(target);
        } else {
          callback(target[observedProperty]);
        }
      }

      // Propogate notification
      if (proxy.parent !== null) {
        proxy.parent.notifyObservers(proxy.propertyNameInParent);
      }
    },

  };


  // Now turn the proxy into an actual Proxy

  const handler = {
    set: function(target, property, newValue) {

      // Make all child objects also deeply observable
      if (typeof newValue === 'object' && newValue !== null) {
        newValue = makeObservable(newValue, proxy, property);
      }

      target[property] = newValue;

      target.notifyObservers(property);

      return true;

    }

  };

  return makeProxyBut(target, handler, proxy)
  
}



const makeObservable =
window.DeepObservables.makeObservable =
function makeObservable(target, parent, propertyNameInParent) {
  const observable = newObservable(parent, propertyNameInParent);
  Object.assign(observable, target);
  return observable;
}


})();
