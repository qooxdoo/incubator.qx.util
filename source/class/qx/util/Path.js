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
    },

    /**
     * Normalises the path and corrects the case of the path to match what is actually on the filing system
     *
     * @param fsPath {String} the filename to normalise
     * @returns {String} the new path
     * @async
     */
    correctCase: function(dir) {
      var drivePrefix = "";
      if (process.platform === "win32" && dir.match(/^[a-zA-Z]:/)) {
        drivePrefix = dir.substring(0, 2);
        dir = dir.substring(2);
      }
      dir = dir.replace(/\\/g, "/");
      var segs = dir.split("/");
      if (!segs.length) {
        return drivePrefix + dir;
      }

      var currentDir;
      var index;
      if (segs[0].length) {
        currentDir = "";
        index = 0;
      } else {
        currentDir = "/";
        index = 1;
      }

      function bumpToNext(nextSeg) {
        index++;
        if (currentDir.length && currentDir !== "/") {
          currentDir += "/";
        }
        currentDir += nextSeg;
        return next();
      }

      function next() {
        if (index == segs.length) {
          if (process.platform === "win32") {
            currentDir = currentDir.replace(/\//g, "\\");
          }
          return Promise.resolve(drivePrefix + currentDir);
        }

        let nextSeg = segs[index];
        if (nextSeg == "." || nextSeg == "..") {
          return bumpToNext(nextSeg);
        }

        return new Promise((resolve, reject) => {
          fs.readdir(currentDir.length == 0 ? "." : drivePrefix + currentDir, { encoding: "utf8" }, (err, files) => {
            if (err) {
              reject(err);
              return;
            }

            let nextLowerCase = nextSeg.toLowerCase();
            let exact = false;
            let insensitive = null;
            for (let i = 0; i < files.length; i++) {
              if (files[i] === nextSeg) {
                exact = true;
                break;
              }
              if (files[i].toLowerCase() === nextLowerCase) {
                insensitive = files[i];
              }
            }
            if (!exact && insensitive) {
              nextSeg = insensitive;
            }

            bumpToNext(nextSeg).then(resolve);
          });
        });
      }

      return new Promise((resolve, reject) => {
        fs.stat(drivePrefix + dir, err => {
          if (err) {
            if (err.code == "ENOENT") {
              resolve(drivePrefix + dir);
            } else {
              reject(err);
            }
          } else {
            next().then(resolve);
          }
        });
      });
    }
    
  }
});