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
 * @require(qx.core.Init)
 * @ignore(process)
 * @ignore(require)
 */
qx.Class.define("qx.test.util.TestRunnerServerApp", {
  extend: qx.application.Basic,
  
  members: {
    async main() {
      qx.log.appender.Node;
      qx.dev.TestRunner.runAll(qx.test.util.TestRequire);
      qx.dev.TestRunner.runAll(qx.test.jsx.TestJsx);
    }
  }
});
