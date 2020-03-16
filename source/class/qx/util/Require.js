/* ************************************************************************
 *
 *    Copyright:
 *      2011-2020 Henner Kollmann
 *
 *    License:
 *      MIT: https://opensource.org/licenses/MIT
 *
 *      This software is provided under the same licensing terms as Qooxdoo,
 *      please see the LICENSE file in the Qooxdoo project's top-level directory
 *      for details.
 *
 *    Authors:
 *      * Henner Kollmann (Henner.Kollmann@gmx.de, @hkollmanan)
 *
 * *********************************************************************** */
const path = require("path");
const fs = require("fs");      

/**
 * Qooxdoo wrapper around node require.
 * If a module is not found it will be loaded inside the qooxdoo process.
 * 
 * So no package.json file and npm install is necessary
 */
qx.Class.define("qx.util.Require", {

  statics: {
  
    /**
     * 
     * helper to load an npm module. Check if it can be loaded before
     * If not install the module with 'npm install --no-save --no-package-lock' to the current library
     * 
     * @param module {String} module to check
     */
    require: function(module) {
      let exists = fs.existsSync(path.join(process.cwd(), "node_modules", module));
      if (!exists) {
        qx.util.Require.loadNpmModule(module);
      }      
      return require(module);
    },

    /**
      * 
      * install an npm module with 'npm install --no-save --no-package-lock' to the current library
      * 
      * @param module {String} module to load
      */
    loadNpmModule: function(module) {
      const {execSync} = require("child_process");
      let s = `npm install --no-save --no-package-lock ${module}`;
      qx.log.Logger.info(s);
      execSync(s, {
        stdio: "inherit"
      });
    }
	
    
  }
});

