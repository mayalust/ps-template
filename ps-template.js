(function(global, factory){
  if(typeof window !== "undefined"){
    if(typeof window['define'] === "function"){
      window['define'](factory);
    } else {
      window.psTemplate = factory();
    }
  } else {
    if(typeof module !== "undefined" && typeof module.exports !== "undefined" ){
      module.exports = factory();
    }
  }
})(this, function(){
  const tostring = Object.prototype.toString,
    isUndefined = isType("Undefined"),
    isNull = isType("Null");
  function isType(type){
    return function(target){
      return tostring.call(target) === "[object " + type + "]";
    }
  }
  function isEmpty(obj){
    return isUndefined(obj) || isNull(obj);
  }
  function html2json(str){
    const blank = `(?:[\\s\\n])`,
      word = `[\\w-$@]`,
      quate = `\\'(?:[^\\\'\\\\]|(?:\\\\\\'))+\\'|\\\"(?:[^\\\"\\\\]|(?:\\\\\\\"))*\\\"`,
      attrLike = `${ word }+${ blank }*(?:=${ blank }*(?:${ quate }))?${ blank }*`,
      ATTRS = `(${ word }+)${ blank }*(?:=${ blank }*(${ quate }))?`,
      COMMONS = `\\<\\!\\--`,
      TAG = `\\<${ blank }*(${ word }+)${ blank }*((?:${ attrLike })*)${ blank }*(\\\/)?${ blank }*\\>`;
    let match, tagStack = [], textStack = [],
      root = rs = {
        localName : "DocumentFragment",
        nodeType : 11,
        children : []
      },
      expr = {
        "HEAD" : {
          exp : new RegExp(TAG),
          handler : function(str, match){
            var obj;
            delete match.item;
            obj = {
              nodeType : 1,
              localName : match[1],
              params : getParams(match[2])
            };
            Object.defineProperty(obj, "parentNode", {
              enumerable : false,
              value : rs
            })
            rs.children = rs.children || [];
            pushTextNode(rs.children, str.slice(0, match.index));
            rs.children.push(obj);
            rs = match[3] ? rs : (tagStack.push(match[1]) , obj);
            return str.slice(match[0].length + match.index);
          }
        },
        "TAIL" : {
          exp : null,
          handler : function(str, match){
            tagStack.pop();
            rs.children = rs.children || [];
            pushTextNode(rs.children, str.slice(0, match.index));
            rs = rs.parentNode;
            return str.slice(match[0].length + match.index);
          }
        },
        "COMMON" : {
          exp : new RegExp(COMMONS),
          handler : function(str, match){
            var matchEnd = new RegExp("--\\>", "g").exec(str), obj;
            rs.children = rs.children || [];
            if(matchEnd){
              obj = {
                nodeType : 8,
                nodeValue : str.slice(match.index + 4, matchEnd.index)
              };
              pushTextNode(rs.children, str.slice(0, match.index));
              rs.children.push(obj);
              return str.slice(matchEnd.index + 3);
            } else {
              obj = {
                nodeType : 8,
                nodeValue : str.slice(match.index + 4)
              };
              pushTextNode(rs.children, str.slice(0, match.index));
              rs.children.push(obj);
              return null;
            }
          }
        }
      };
    function getParams(str){
      let match, obj = null;
      while(match = new RegExp(ATTRS, "g").exec(str)){
        obj = obj || {};
        obj[match[1]] = match[2] ? match[2].slice(1,-1) : "";
        str = str.slice(match[0].length + match.index);
      }
      return obj;
    }
    function pushTextNode(arr, str){
      let item;
      while(item = textStack.pop()){
        str = item + str;
      }
      !new RegExp("^" + blank + "*$").test(str) && arr.push({
        localName : "text",
        nodeType : 3,
        nodeValue : str
      });
    }
    function check(str){
      var match, m, item, len = tagStack.length;
      expr["TAIL"].exp = new RegExp("\\<\\s*\\/\\s*(" + tagStack[len - 1] + ")\\s*\\>");
      for(var i in expr){
        m = expr[i]["exp"].exec(str);
        match = m ? (
          match ? (
            m.index < match.index ? ( item = expr[i], m ) : match
          ) : ( item = expr[i], m )
        ) : match;
      }
      return match
        ? item["handler"](str, match)
        : undefined
    }
    while(true){
      match = check(str);
      if(typeof match === "undefined"){
        break;
      }
      str = match;
    };
    pushTextNode(root.children, str);
    return root;
  }
  function json2html(json, beautify){
    function format(str, depth){
      var n = "", blankReturn = /^[\s\n]*$/g, beforeafterBlank = /^[\s\n]+([^\s\n](?:.*[^\s\n])?)[\s\n]+$/g;
      function removeBeforeAfterBlank(str){
        var match = /^[\s\n]*([^\s\n](?:.*[^\s\n])?)[\s\n]*$/g.exec(str);
        return match ? match[1] : "";
      }
      while( depth-- > 0 ){
        n += "\f\f";
      };
      return beautify ? ( !blankReturn.test(removeAllReturn(str))
        ? n + removeBeforeAfterBlank(removeAllReturn(str)) + "\n" : "" ) : str ;
    }
    let renderMethods = {
      header : {
        1 : function(node, depth){
          switch (typeof node.localName === "string" ? node.localName.toUpperCase() : "") {
            case "INPUT" :
              return format("<" + node.localName + params2String(node.params) + "/>", depth);
            default :
              return format("<" + node.localName + params2String(node.params) + ">", depth);
          }
        },
        3 : function(node, depth){
          return format(node.nodeValue, depth);
        },
        8 : function(node, depth){
          return format("<!--" + node.nodeValue + "-->", depth);
        }
      },
      tail : {
        1 : function(node, depth){
          switch (typeof node.localName === "string" ? node.localName.toUpperCase() : "") {
            case "INPUT" :
              return "";
            default :
              return format("</" + node.localName + ">", depth);
          }
        }
      }
    }
    function removeAllReturn(str){
      var rs = "";
      for(var i = 0; i < str.length; i++){
        rs += str.charAt(i) !== "\n"
          ? str.charAt(i) : "";
      }
      return rs;
    }
    function params2String(params){
      var str = "";
      for(var i in params){
        str += " " + i + ( isEmpty( params[i] )
          ? ""
          : "=\"" + params[i] + "\"");
      }
      return str;
    }
    function renderHead(node, depth){
      return renderMethods.header[node.nodeType]
        ? renderMethods.header[node.nodeType](node, depth)
        : "";
    }
    function renderTail(node, depth){
      return renderMethods.tail[node.nodeType]
        ? renderMethods.tail[node.nodeType](node, depth)
        : "";
    }
    function recursive(node, depth){
      var str = renderHead(node, depth);
      for(var i = 0; i < (node.children ? node.children.length : 0); i++){
        str += recursive(node.children[i], depth+1);
      }
      str += renderTail(node, depth);
      return str;
    }
    return recursive(json, -1)
  }
  function beautify(str){
    return json2html(html2json(str), true);
  }
  return {
    html2json : html2json,
    json2html : json2html,
    beautify : beautify
  }
});