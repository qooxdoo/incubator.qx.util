qx.Class.define("qx.html.JsxRef", {
  extend: qx.core.Object,
  
  properties: {
    value: {
      init: null,
      nullable: true,
      check: "qx.html.Element",
      event: "changeValue"
    }
  },
  
  members: {
    
  }
});

