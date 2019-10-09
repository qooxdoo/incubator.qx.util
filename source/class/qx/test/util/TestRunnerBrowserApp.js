qx.Class.define("qx.test.util.TestRunnerBrowserApp", {
  extend: qx.application.Standalone,

  members: {
    main() {
      this.base(arguments);

      if (qx.core.Environment.get("qx.debug")) {
        qx.log.appender.Native;
        qx.log.appender.Console;
      }

      let doc = this.getRoot();
      
      let root = new qx.ui.container.Composite(new qx.ui.layout.VBox());
      doc.add(root, { left: 0, top: 0, right: 0, bottom: 0 });
      
      this._tb = new qx.ui.toolbar.ToolBar();
      root.add(this._tb);
      
      this._txt = new qx.ui.form.TextArea();
      root.add(this._txt);
      
      qx.dev.TestRunner.runAll(qx.test.jsx.TestJsx);
      qx.dev.TestRunner.runAll(qx.test.jsx.TestJsxBrowser);
      
      
    }
  }
});