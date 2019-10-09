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
     * Alexander Lopez (https://github.com/alecsgone)

   This class includes work from on https://github.com/alecsgone/jsx-render; at the time of writing, 
   the https://github.com/alecsgone/jsx-render repo is available under an MIT license.
  
************************************************************************ */

/**
 * This class includes work from on https://github.com/alecsgone/jsx-render; at the time of writing, 
 * the https://github.com/alecsgone/jsx-render repo is available under an MIT license. 
 */
qx.Class.define("qx.html.Jsx", {
  extend: qx.core.Object,
  
  statics: {
    createElement(tagname, attributes, ...children) {
      if (typeof tagname === "function") { 
        throw new Error("Custom tags are not supported");
      }
      let styles = null;
      let newAttrs = {};
      let eventHandlers = {};
      let innerHtml = null;
      let refs = [];
      
      if (attributes) {
        const RENAME = {
            "className": "class",
            "htmlFor": "for",
            "xlinkHref": "xlink:href"
        };
        
        Object.keys(attributes).forEach(prop => {
          let renameTo = RENAME[prop];
          if (renameTo) {
            newAttrs[renameTo] = attributes[prop]; 
            return;
          }
          
          if (prop == "style") {
            let tmp = attributes.style;
            styles = {};
            tmp.split(/;/).forEach(seg => {
              let pos = seg.indexOf(":");
              let key = seg.substring(0, pos);
              let value = seg.substring(pos + 1).trim();
              styles[key] = value.trim();
            });
            
          } else if (prop === "ref") {
            if (attributes.ref instanceof qx.html.JsxRef || typeof attributes.ref === "function") {
              refs.push(attributes.ref);
            } else {
              this.warn("Unsupported type of `ref` argument: " + typeof attributes.ref);
            }
            
          } else if (prop === "dangerouslySetInnerHTML") {
            // eslint-disable-next-line no-underscore-dangle
            innerHtml = attributes[prop].__html;
            
          } else if (qx.html.Jsx.SYNTETIC_EVENTS[prop]) {
            const eventName = prop.replace(/^on/, "").toLowerCase();
            eventHandlers[eventName] = attributes[prop];
            
          } else {
            // any other prop will be set as attribute
            newAttrs[prop] = attributes[prop];
          }
        });
      }
      
      let element = new qx.html.Element(tagname, styles, newAttrs);
      if (children) {
        children.forEach(child => {
          if (typeof child == "string") {
            element.add(new qx.html.Text(child));
          } else {
            element.add(child);
          }
        });
      }
      if (innerHtml) {
        element.setProperty("innerHtml", innerHtml);
      }
      for (let eventName in eventHandlers) {
        element.addListener(eventName, eventHandlers[eventName]);
      }
      refs.forEach(ref => {
        if (ref instanceof qx.html.JsxRef) {
          ref.setValue(element);
        } else { 
          ref(element, attributes);
        }
      });
      
      return element;
    },
    
    SYNTETIC_EVENTS: null
  },
  
  defer(statics) {
    const MOUSE_EVENTS = [
      "onClick",
      "onContextMenu",
      "onDoubleClick",
      "onDrag",
      "onDragEnd",
      "onDragEnter",
      "onDragExit",
      "onDragLeave",
      "onDragOver",
      "onDragStart",
      "onDrop",
      "onMouseDown",
      "onMouseEnter",
      "onMouseLeave",
      "onMouseMove",
      "onMouseOut",
      "onMouseOver",
      "onMouseUp",
    ];

    const TOUCH_EVENTS = ["onTouchCancel", "onTouchEnd", "onTouchMove", "onTouchStart"];

    const KEYBOARD_EVENTS = ["onKeyDown", "onKeyPress", "onKeyUp"];

    const FOCUS_EVENTS = ["onFocus", "onBlur"];

    const FORM_EVENTS = ["onChange", "onInput", "onInvalid", "onSubmit"];

    const UI_EVENTS = ["onScroll"];

    const IMAGE_EVENTS = ["onLoad", "onError"];

    const synteticEvents = [
      ...MOUSE_EVENTS,
      ...TOUCH_EVENTS,
      ...KEYBOARD_EVENTS,
      ...FOCUS_EVENTS,
      ...FORM_EVENTS,
      ...UI_EVENTS,
      ...IMAGE_EVENTS,
    ];
    
    let SYNTETIC_EVENTS = qx.html.Jsx.SYNTETIC_EVENTS = {};
    synteticEvents.forEach(key => SYNTETIC_EVENTS[key] = true);
    
  }
});