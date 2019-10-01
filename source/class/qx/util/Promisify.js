/* ************************************************************************
 *
 *    qooxdoo-compiler - node.js based replacement for the Qooxdoo python
 *    toolchain
 *
 *    https://github.com/qooxdoo/qooxdoo-compiler
 *
 *    Copyright:
 *      2011-2017 Zenesis Limited, http://www.zenesis.com
 *
 *    License:
 *      MIT: https://opensource.org/licenses/MIT
 *
 *      This software is provided under the same licensing terms as Qooxdoo,
 *      please see the LICENSE file in the Qooxdoo project's top-level directory
 *      for details.
 *
 *    Authors:
 *      * John Spackman (john.spackman@zenesis.com, @johnspackman)
 *
 * *********************************************************************** */

qx.Class.define("qx.util.Promisify", {
  statics: {
    CUSTOM_PROMISIFIED_SYMBOL: "__isPromisified__",
    CUSTOM_PROMISIFY_ARGS_SYMBOL: "__promisifiedArgs__",
    IGNORED_PROPS: /^(?:length|name|arguments|caller|callee|prototype|__isPromisified__)$/,
    PromisePool: null,

    promisifyAll: function(target, fn) {
      const CUSTOM_PROMISIFIED_SYMBOL = qx.util.Promisify.CUSTOM_PROMISIFIED_SYMBOL;
      Object.getOwnPropertyNames(target).forEach(key => {
        if (this.IGNORED_PROPS.test(key) || (fn && fn(key, target) === false)) {
          return;
        }
        if (typeof target[key] !== "function") {
          return;
        }
        if (this.isPromisified(target[key])) {
          return;
        }

        var promisifiedKey = key + "Async";

        target[promisifiedKey] = this.promisify(target[key]);

        [key, promisifiedKey].forEach(key => {
          Object.defineProperty(target[key], this.CUSTOM_PROMISIFIED_SYMBOL, {
            value: true,
            configurable: true,
            enumerable: false,
            writable: true
          });
        });
      });

      return target;
    },

    isPromisified: function(fn) {
      try {
        return fn[this.CUSTOM_PROMISIFIED_SYMBOL] === true;
      } catch (e) {
        return false;
      }
    },

    /**
     * Promisify's a function; taken from nodejs' utils.js 
     * https://github.com/nodejs/node/blob/master/lib/internal/util.js#L254-L304
     * 
     * @param original {Function} function to promisify
     * @param context {Object?} optional binding context
     * @return {Function} the promisified function
     */
    promisify: function(original, context) {
      const CUSTOM_PROMISIFIED_SYMBOL = qx.util.Promisify.CUSTOM_PROMISIFIED_SYMBOL;
      const CUSTOM_PROMISIFY_ARGS_SYMBOL = qx.util.Promisify.CUSTOM_PROMISIFY_ARGS_SYMBOL;
      
      qx.core.Assert.assertEquals("function", typeof original);

      if (original[CUSTOM_PROMISIFIED_SYMBOL]) {
        const fn = original[CUSTOM_PROMISIFIED_SYMBOL];
        qx.core.Assert.assertEquals("function", typeof fn);
        return Object.defineProperty(fn, CUSTOM_PROMISIFIED_SYMBOL, {
          value: fn, enumerable: false, writable: false, configurable: true
        });
      }

      // Names to create an object from in case the callback receives multiple
      // arguments, e.g. ['bytesRead', 'buffer'] for fs.read.
      const argumentNames = original[CUSTOM_PROMISIFY_ARGS_SYMBOL];

      function fn(...args) {
        return new qx.Promise((resolve, reject) => {
          original.call(this, ...args, (err, ...values) => {
            if (err) {
              return reject(err);
            }
            if (argumentNames !== undefined && values.length > 1) {
              const obj = {};
              for (var i = 0; i < argumentNames.length; i++)
                obj[argumentNames[i]] = values[i];
              resolve(obj);
            } else {
              resolve(values[0]);
            }
          });
        });
      }

      Object.setPrototypeOf(fn, Object.getPrototypeOf(original));

      Object.defineProperty(fn, CUSTOM_PROMISIFIED_SYMBOL, {
        value: fn, enumerable: false, writable: false, configurable: true
      });
      let promisified = Object.defineProperties(
        fn,
        Object.getOwnPropertyDescriptors(original)
      );
      
      if (context) {
        promisified = promisified.bind(context);
      }
      return promisified;
    },
    
    async poolEachOf(arr, size, fn) {
      let index = 0;
      let pool = new qx.util.Promisify.PromisePool(() => {
        if (index >= arr.length) {
          return null;
        }
        let item = arr[index++];
        return fn(item);
      }, 10);
      await pool.start();
    },
    
    async map(arr, fn) {
      return await qx.Promise.all(arr.map(fn));
    },
    
    async some(arr, fn) {
      return await new qx.Promise((resolve, reject) => {
        let count = 0;
        arr.forEach((...args) => {
          qx.Promise.resolve(fn(...args))
            .then(result => {
              count++;
              if (result && resolve) {
                resolve(true);
                resolve = null;
              }
              if (count == arr.length && resolve) {
                resolve(false);
              }
              return null;
            });
        });
      });
    },
    
    async someEach(arr, fn) {
      let index = 0;
      const next = () => {
        if (index >= arr.length) {
          return qx.Promise.resolve(false);
        }
        let item = arr[index++];
        return qx.Promise.resolve(fn(item))
          .then(result => {
            if (result) {
              return true;
            }
            return next();
          });
      };
      return await next();
    },

    async somePool(arr, size, fn) {
      return await new qx.Promise((resolve, reject) => {
        let index = 0;
        let pool = new qx.util.Promisify.PromisePool(() => {
          if (!resolve) {
            return null;
          }
          if (index >= arr.length) {
            resolve(false);
            return null;
          }
          let item = arr[index++];
          return fn(item)
            .then(result => {
              if (result && resolve) {
                resolve(true);
                resolve = null;
              }
            });
        }, 10);
        pool.start();
      });
    },

    call: function(fn) {
      return new Promise((resolve, reject) => {
        fn((err, ...args) => {
          if (err) {
            reject(err);
          } else {
            resolve(...args);
          }
        });
      });
    },
    
    /**
     * Resolves a value if necessary and calls the callback; if the value is not a
     * promise, the callback will be called immediately (and not asynchronously).
     * 
     * This is useful when handling situations where there *may* be a promise, but
     * it is not desirable to always treat a value as a promise; for example, when 
     * event handling if a value is treated as a promise then the callback is always
     * async and the caller has to know to treat it as such (and pass the promise
     * chain back).  It should be the caller's decision to create a promise and then
     * they know they have to track it; this code will only treat the value as a promise
     * if really necessary, preferring traditional synchronous code 
     * 
     * @param value {Object} the value to check
     * @param cb {Function} function to call, passed the resolved value
     * @returns whatever `cb` returns, or a promise if `value` is a promise
     */
    resolveNow(value, cb) {
      if (value instanceof qx.Promise || value instanceof Promise) {
        return value.then(cb);
      } else {
        return cb(value);
      }
    },
    
    /**
     * Resolves all values in an array if necessary and calls the callback; if the value 
     * is not a promise, the callback will be called immediately (and not asynchronously).
     * 
     * This is useful when handling situations where there *may* be a promise, but
     * it is not desirable to always treat a value as a promise; for example, when 
     * event handling if a value is treated as a promise then the callback is always
     * async and the caller has to know to treat it as such (and pass the promise
     * chain back).  It should be the caller's decision to create a promise and then
     * they know they have to track it; this code will only treat the value as a promise
     * if really necessary, preferring traditional synchronous code 
     * 
     * @param value {Object} the value to check
     * @param cb {Function} function to call, passed the resolved value
     * @returns whatever `cb` returns, or a promise if `value` is a promise
     */
    allNow(arr, cb, cberr) {
      if (arr.some(value => value instanceof qx.Promise || value instanceof Promise))
        return qx.util.Promisify.chain(qx.Promise.all(arr), cb, cberr);
      return cb ? cb(arr) : arr;
    },

    /**
     * Chains a promise into success callback and error callback  
     * 
     * @param promise {Promise} the promise
     * @param cb {Function} then function
     * @param cberr {Function} catch function
     */
    chain(promise, cb, cberr) {
      if (cb)
        promise = promise.then(cb);
      if (cberr)
        promise = promise.catch(cberr);
      return promise;
    },

    fs: null,

    each: function(coll, fn) {
      return qx.util.Promisify.eachOf(coll, fn);
    },

    forEachOf: function(coll, fn) {
      return qx.util.Promisify.eachOf(coll, fn);
    },

    eachOf: function(coll, fn) {
      let promises = Object.keys(coll).map(key => fn(coll[key], key));
      return qx.Promise.all(promises);
    },

    eachSeries: function(coll, fn) {
      return qx.util.Promisify.eachOfSeries(coll, fn);
    },

    forEachOfSeries: function(coll, fn) {
      return qx.util.Promisify.eachOfSeries(coll, fn);
    },

    eachOfSeries: function(coll, fn) {
      let keys = Object.keys(coll);
      let index = 0;
      function next() {
        if (index == keys.length) {
          return qx.Promise.resolve();
        }
        let key = keys[index];
        index++;
        var result = fn(coll[key], key);
        return qx.Promise.resolve(result)
          .then(next);
      }
      return next();
    }

  },

  /**
   * @ignore(require)
   */
  defer: function(statics) {
    if (typeof require == "function") {
      statics.fs = statics.promisifyAll(require("fs"), function(key, fs) {
        return key !== "SyncWriteStream" && key != "exists";
      });
      statics.fs.existsAsync = filename => {
        return new qx.Promise(resolve => statics.fs.exists(filename, resolve));
      };
    }
  }
});


/**
 * PromisePool comes from https://github.com/timdp/es6-promise-pool
 */

(function (root, factory) {
  qx.util.Promisify.PromisePool = factory();
})(this, function () {
  'use strict'

  var EventTarget = function () {
    this._listeners = {}
  }

  EventTarget.prototype.addEventListener = function (type, listener) {
    this._listeners[type] = this._listeners[type] || []
    if (this._listeners[type].indexOf(listener) < 0) {
      this._listeners[type].push(listener)
    }
  }

  EventTarget.prototype.removeEventListener = function (type, listener) {
    if (this._listeners[type]) {
      var p = this._listeners[type].indexOf(listener)
      if (p >= 0) {
        this._listeners[type].splice(p, 1)
      }
    }
  }

  EventTarget.prototype.dispatchEvent = function (evt) {
    if (this._listeners[evt.type] && this._listeners[evt.type].length) {
      var listeners = this._listeners[evt.type].slice()
      for (var i = 0, l = listeners.length; i < l; ++i) {
        listeners[i].call(this, evt)
      }
    }
  }

  var isGenerator = function (func) {
    return (typeof func.constructor === 'function' &&
      func.constructor.name === 'GeneratorFunction')
  }

  var functionToIterator = function (func) {
    return {
      next: function () {
        var promise = func()
        return promise ? {value: promise} : {done: true}
      }
    }
  }

  var promiseToIterator = function (promise) {
    var called = false
    return {
      next: function () {
        if (called) {
          return {done: true}
        }
        called = true
        return {value: promise}
      }
    }
  }

  var toIterator = function (obj, Promise) {
    var type = typeof obj
    if (type === 'object') {
      if (typeof obj.next === 'function') {
        return obj
      }
      /* istanbul ignore else */
      if (typeof obj.then === 'function') {
        return promiseToIterator(obj)
      }
    }
    if (type === 'function') {
      return isGenerator(obj) ? obj() : functionToIterator(obj)
    }
    return promiseToIterator(Promise.resolve(obj))
  }

  var PromisePoolEvent = function (target, type, data) {
    this.target = target
    this.type = type
    this.data = data
  }

  var PromisePool = function (source, concurrency, options) {
    EventTarget.call(this)
    if (typeof concurrency !== 'number' ||
        Math.floor(concurrency) !== concurrency ||
        concurrency < 1) {
      throw new Error('Invalid concurrency')
    }
    this._concurrency = concurrency
    this._options = options || {}
    this._options.promise = this._options.promise || Promise
    this._iterator = toIterator(source, this._options.promise)
    this._done = false
    this._size = 0
    this._promise = null
    this._callbacks = null
  }
  PromisePool.prototype = new EventTarget()
  PromisePool.prototype.constructor = PromisePool

  PromisePool.prototype.concurrency = function (value) {
    if (typeof value !== 'undefined') {
      this._concurrency = value
      if (this.active()) {
        this._proceed()
      }
    }
    return this._concurrency
  }

  PromisePool.prototype.size = function () {
    return this._size
  }

  PromisePool.prototype.active = function () {
    return !!this._promise
  }

  PromisePool.prototype.promise = function () {
    return this._promise
  }

  PromisePool.prototype.start = function () {
    var that = this
    var Promise = this._options.promise
    this._promise = new Promise(function (resolve, reject) {
      that._callbacks = {
        reject: reject,
        resolve: resolve
      }
      that._proceed()
    })
    return this._promise
  }

  PromisePool.prototype._fireEvent = function (type, data) {
    this.dispatchEvent(new PromisePoolEvent(this, type, data))
  }

  PromisePool.prototype._settle = function (error) {
    if (error) {
      this._callbacks.reject(error)
    } else {
      this._callbacks.resolve()
    }
    this._promise = null
    this._callbacks = null
  }

  PromisePool.prototype._onPooledPromiseFulfilled = function (promise, result) {
    this._size--
    if (this.active()) {
      this._fireEvent('fulfilled', {
        promise: promise,
        result: result
      })
      this._proceed()
    }
  }

  PromisePool.prototype._onPooledPromiseRejected = function (promise, error) {
    this._size--
    if (this.active()) {
      this._fireEvent('rejected', {
        promise: promise,
        error: error
      })
      this._settle(error || new Error('Unknown error'))
    }
  }

  PromisePool.prototype._trackPromise = function (promise) {
    var that = this
    promise
      .then(function (result) {
        that._onPooledPromiseFulfilled(promise, result)
      }, function (error) {
        that._onPooledPromiseRejected(promise, error)
      })['catch'](function (err) {
        that._settle(new Error('Promise processing failed: ' + err))
      })
  }

  PromisePool.prototype._proceed = function () {
    if (!this._done) {
      var result = { done: false }
      while (this._size < this._concurrency &&
          !(result = this._iterator.next()).done) {
        this._size++
        this._trackPromise(result.value)
      }
      this._done = (result === null || !!result.done)
    }
    if (this._done && this._size === 0) {
      this._settle()
    }
  }

  PromisePool.PromisePoolEvent = PromisePoolEvent
  // Legacy API
  PromisePool.PromisePool = PromisePool

  return PromisePool
});
