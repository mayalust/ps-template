(function(global, factory){
  if(typeof window !== "undefined"){
    if(typeof window['define'] === "function"){
      window['define'](factory);
    } else {
      window.psTemplate = factory();
    }
  } else {
    if(typeof module !== "undefined" && typeof module.exports === "function" ){
      module.exports = factory();
    }
  }
})(this, function(){
  function html2json(str){
    const blank = "(?:[\\s\\n])"
    quate = "\\'(?:[^\\\'\\\\]|(?:\\\\\\'))+\\'|\\\"(?:[^\\\"\\\\]|(?:\\\\\\\"))+\\\"",
      attrLike = blank + "+[\\w\\-$]+" + blank + "*=" + blank + "*(?:" + quate + ")",
      ATTRS = "([\\w\\-$]+)" + blank + "*=" + blank + "*(" + quate + ")",
      COMMONS = "\\<\\!\\--",
      avaliableWord = "^" + blank + "*([^\\s\\n]|[^\\s\\n].*[^\\s\\n])" + blank + "*$",
      TAG = "\\<" + blank + "*(\\w+)((?:" + attrLike + ")*)" + blank + "*(\\\/)?" + blank + "*\\>";
    let tagExp = new RegExp(TAG, "g"),
      match, tagStack = [], textStack = [],
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
        obj[match[1]] = match[2] ? match[2].slice(1,-1) : null;
        str = str.slice(match[0].length + match.index);
      }
      return obj;
    }
    function pushTextNode(arr, str){
      let item;
      while(item = textStack.pop()){
        str = item + str;
      }
      str && arr.push({
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
  function json2html(json){
    let renderMethods = {
      header : {
        1 : function(node){
          switch (typeof node.localName === "string" ? node.localName.toUpperCase : "") {
            default :
              return "<" + node.localName + params2String(node.params) + ">";
          }
        },
        3 : function(node){
          return node.nodeValue;
        },
        8 : function(node){
          return "<!--" + node.nodeValue + "-->";
        }
      },
      tail : {
        1 : function(node){
          switch (typeof node.localName === "string" ? node.localName.toUpperCase : "") {
            case "INPUT" :
              return "";
            default :
              return "</" + node.localName + ">";
          }
        }
      }
    }
    function params2String(params){
      var str = "";
      for(var i in params){
        str += " " + i + "=\"" + params[i] + "\"";
      }
      return str;
    }
    function renderHead(node){
      return renderMethods.header[node.nodeType]
        ? renderMethods.header[node.nodeType](node)
        : "";
    }
    function renderTail(node){
      return renderMethods.tail[node.nodeType]
        ? renderMethods.tail[node.nodeType](node)
        : "";
    }
    function recursive(node, depth){
      var str = renderHead(node);
      for(var i = 0; i < (node.children ? node.children.length : 0); i++){
        str += recursive(node.children[i], depth+1);
      }
      str += renderTail(node);
      return str;
    }
    return recursive(json, 0)
  }
  return {
    html2json : html2json,
    json2html : json2html
  }
});