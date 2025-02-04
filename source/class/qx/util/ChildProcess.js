/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2020 Zenesis Limited, http://www.zenesis.com

   License:
     MIT: https://opensource.org/licenses/MIT
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * John Spackman (john.spackman@zenesis.com, @johnspackman)

************************************************************************ */

const child_process = require("child_process");

qx.Class.define("qx.util.ChildProcess", {
  extend: qx.core.Object,
  
  statics: {
    /**
     * Runs the given command and returns an object containing information on the
     * `exitCode`, the `output`, potential `error`s, and additional `messages`.
     * @param {Map} opts options, containing:
     *    cmd {String|String[]} command and arguments
     *    cwd {String} The current working directory
     *    onConsole {Function} callback for the console output
     *    copyToConsole {Boolean?} if true, console output is copied to this process' console
     *    mergeOutput {Boolean?} if true, stderr is merged into stdout (this is the default)
     *
     * @return {Map}:
     *    exitCode {Number}
     *    output: {String}
     *    error: *
     *    messages: *
     */
    async runCommand(opts) {
      return new Promise((resolve, reject) => {
        let cmd;
        let args;
        if (typeof opts.cmd == "string") {
          cmd = opts.cmd;
          args = [];
        } else if (qx.lang.Type.isArray(opts.cmd)) {
          args = qx.lang.Array.clone(opts.cmd);
          cmd = args.shift();
        }
        let spawnArgs = {
          shell: true
        };
        if (opts.cwd)
          spawnArgs.cmd = opts.cwd;
        let proc = child_process.spawn(cmd, args, spawnArgs);
        let result = {
          exitCode: null,
          output: "",
          error: "",
          messages: null
        };
        function onStdout(data) {
          data = data.toString().trim();
          if (opts.copyToConsole)
            console.log(data);
          result.output += data;
          if (opts.onConsole)
            opts.onConsole(data, "stdout");
        }
        function onStderr(data) {
          data = data.toString().trim();
          if (opts.copyToConsole)
            console.error(data);
          result.error += data;
          if (opts.onConsole)
            opts.onConsole(data, "stderr");
        }
        proc.stdout.on("data", onStdout);
        proc.stderr.on("data", opts.mergeOutput === false ? onStderr : onStdout);
        proc.on("close", code => {
          result.exitCode = code;
          resolve(result);
        });
        proc.on("error", err => {
          reject(err);
        });
      });
    }
  }
});