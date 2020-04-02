/* ************************************************************************
 *
 *    Qooxdoo Node Utils Incubator
 *
 *    https://github.com/qooxdoo/incubator.qx.util
 *
 *    Copyright:
 *      2011-2020 Zenesis Limited, http://www.zenesis.com
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

/**
 * Provides static methods for common path related functions
 * 
 */

const path = require("path");
const fs = qx.util.Promisify.fs;

qx.Class.define("qx.util.Path", {
  extend: qx.core.Object,
  
  statics: {
    /**
     * Creates the parent directory of a filename, if it does not already exist
     *
     * @param {String} filename the filename to create the parent directory of
     */
    makeParentDir: async function(filename) {
      var parentDir = path.dirname(filename);
      await qx.util.Path.makeDirs(parentDir);
    },

    /**
     * Creates a directory, if it does not exist, including all intermediate paths
     *
     * @param {String} filename the directory to create
     */
    makeDirs: async function(filename) {
      filename = path.normalize(filename);
      let segs = filename.split(path.sep);
      let made = "";
      for (let i = 0; i < segs.length; i++) {
        let seg = segs[i];
        if (made.length || !seg.length) {
          made += "/";
        }
        made += seg;
        if (!(await fs.existsAsync(made))) {
          try {
            await fs.mkdirAsync(made);
          }catch(err) {
            if (err.code !== "EEXIST")
              throw err;
          }
          let stat = await fs.statAsync(made);
          if (!stat.isDirectory()) {
            throw new Error("Cannot create " + made + " because it exists and is not a directory", "ENOENT");
          }
        }
      }
    }
    
  }
});