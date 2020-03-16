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
const fs = require("fs");

qx.Class.define("qx.test.util.TestRequire", {
  extend: qx.dev.unit.TestCase,

  members: {
    testLoadNpmModule() {
      qx.util.Require.loadNpmModule("mkpath");
      this.assert(fs.existsSync("node_modules/mkpath/mkpath.js"));
    },

    testRequire() {
      let ajv = qx.util.Require.require("ajv");
      this.assertFunction(ajv);
    },
    
  }
});
