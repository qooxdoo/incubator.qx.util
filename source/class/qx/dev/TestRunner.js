/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2019 Zenesis Ltd http://www.zenesis.com

   License:
     MIT: https://opensource.org/licenses/MIT
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * John Spackman (https://github.com/johnspackman)

************************************************************************ */

/**
 * Helper class to simulate the TestRunner, but without loading all the classes
 */
qx.Class.define("qx.dev.TestRunner", {
  extend: qx.core.Object,
  statics: {
    
    /**
     * Unit tests all methods in a class where the method name begins "test", unless the
     * `methodNames` parameter is provided to list the method names explicitly.  Tests can be
     * asynchronous, so this returns a promise
     * 
     *  @param clazz {Class} the class to unit test
     *  @param methodNames {String[]?} optional list of method names
     *  @return {qx.Promise} promise for completion of all tests
     */
    runAll: function(clazz, methodNames) {
      function showExceptions(arr) {
        arr.forEach(item => {
          qx.log.Logger.error(item.test.getClassName() + "." + item.test.getName() + ": " + item.exception);
        });
      };

      if (!methodNames) {
        methodNames = [];
        Object.keys(clazz.prototype).forEach(function(name) {
          if (name.length < 5 || !name.startsWith("test") || name.substring(4, 5) != name.substring(4, 5).toUpperCase())
            return;
          methodNames.push(name);
        });
      }
      
      return new qx.Promise((resolve) => {
        var pos = clazz.classname.lastIndexOf('.');
        var pkgname = clazz.classname.substring(0, pos);
        var loader = new qx.dev.unit.TestLoaderBasic(pkgname);
        loader.getSuite().add(clazz);
        
        var testResult = new qx.dev.unit.TestResult();
        testResult.addListener("startTest", evt => { 
          qx.log.Logger.info("Running test " + evt.getData().getFullName()); 
        });
        testResult.addListener("endTest", evt => { 
          qx.log.Logger.info("End of " + evt.getData().getFullName());
          setTimeout(next, 1);
        });
        testResult.addListener("wait", evt => qx.log.Logger.info("Waiting for " + evt.getData().getFullName()));
        testResult.addListener("failure", evt => showExceptions(evt.getData()));
        testResult.addListener("error", evt => showExceptions(evt.getData()));
        testResult.addListener("skip", evt => showExceptions(evt.getData()));
        
        var methodNameIndex = -1;
        function next() {
          methodNameIndex++;
          if (!methodNames) {
            if (methodNameIndex === 0){
              loader.runTests(testResult, clazz.classname, null);
            } else {
              resolve();
            }
          } else {
            if (methodNameIndex < methodNames.length)
              loader.runTests(testResult, clazz.classname, methodNames[methodNameIndex]);
            else
              resolve();
          }
        }

        next();
      });
    },
    
    runAllXX: function(clazz, methodNames) {
      if (typeof methodNames == "string")
        methodNames = [methodNames];
      if (!methodNames) {
        methodNames = [];
        Object.keys(clazz.prototype).forEach(function(name) {
          if (name.length < 5 || !name.startsWith("test") || name.substring(4, 5) != name.substring(4, 5).toUpperCase())
            return;
          methodNames.push(name);
        });
      }
      var obj = new clazz();
      var p = qx.Promise.resolve();
      methodNames.forEach(methodName => {
        p = p.then(() => {
          return new qx.Promise((resolve, reject) => {
              var fn = obj[methodName];
              obj.setTestResult({
                run: function() {
                  console.log("Finished async " + methodName);
                  resolve();
                }
              });
              try {
                console.log("Starting " + methodName); 
                fn.call(obj);
                console.log("Finished " + methodName);
                resolve();
              } catch(ex) {
                if (!(ex instanceof qx.dev.unit.AsyncWrapper)) {
                  console.log("Error in " + methodName + ": " + (ex.stack||ex));
                  reject(ex);
                }
              }
            });
        });
      });
      return p.then(() => console.log("Finished all tests"));
    }
      
  }
});