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
  function writeContentToParentNodes(node, str){
    while(node = node.parentNode){
      node.innerHTML += str;
    }
  }
  function html2json(str){
    const blank = `(?:[\\s\\n])`,
      word = `[\\w-$@]`,
      quate = `\\'(?:[^\\\'\\\\]|(?:\\\\\\'))+\\'|\\\"(?:[^\\\"\\\\]|(?:\\\\\\\"))*\\\"`,
      attrLike = `${ word }+${ blank }*(?:=${ blank }*(?:${ quate }))?${ blank }*`,
      ATTRS = `(${ word }+)${ blank }*(?:=${ blank }*(${ quate }))?`,
      COMMONS = `\\<\\!\\--`,
      TAG = `\\<${ blank }*(${ word }+)${ blank }*((?:${ attrLike })*)${ blank }*(\\\/)?${ blank }*\\>`;
    function isSelfCircledTag(str){
      return /(?:INPUT)|(?:HR)|(?:BR)/g.test(str.toUpperCase());
    }
    let match, tagStack = [], textStack = [],
      root = rs = {
        nodeName : "DocumentFragment",
        nodeType : 11,
        children : [],
        childNodes : [],
        innerHTML : ""
      },
      expr = {
        "HEAD" : {
          exp : new RegExp(TAG),
          handler : function(str, match){
            var obj;
            delete match.item;
            obj = {
              nodeType : 1,
              nodeName : match[1].toUpperCase(),
              tagName : match[1].toUpperCase(),
              attributes : getParams(match[2]),
              innerHTML : ""
            };
            Object.defineProperty(obj, "parentNode", {
              enumerable : false,
              value : rs
            })
            rs.children = rs.children || [];
            rs.childNodes = rs.childNodes || [];
            pushTextNode(rs.childNodes, str.slice(0, match.index));
            rs.childNodes.push(obj);
            rs.children.push(obj);
            rs = isSelfCircledTag(match[1]) || match[3] ? rs : (tagStack.push(match[1]) , obj);
            writeContentToParentNodes(obj, str.slice(0, match[0].length + match.index));
            return str.slice(match[0].length + match.index);
          }
        },
        "TAIL" : {
          exp : null,
          handler : function(str, match){
            tagStack.pop();
            rs.childNodes = rs.childNodes || [];
            pushTextNode(rs.childNodes, str.slice(0, match.index));
            rs.innerHTML += str.slice(0, match.index);
            writeContentToParentNodes(rs, str.slice(0, match[0].length + match.index));
            rs = rs.parentNode;
            return str.slice(match[0].length + match.index);
          }
        },
        "COMMON" : {
          exp : new RegExp(COMMONS),
          handler : function(str, match){
            var matchEnd = new RegExp("--\\>", "g").exec(str),
              obj = {
              nodeName : "#comment",
              nodeType : 8,
              nodeValue : matchEnd ? str.slice(match.index + 4, matchEnd.index) : str.slice(match.index + 4),
            };
            Object.defineProperty(obj, "parentNode", {
              enumerable : false,
              value : rs
            });
            rs = obj;
            matchEnd ? writeContentToParentNodes(rs, str.slice(0,  matchEnd.index + matchEnd[0].length))
              : writeContentToParentNodes(rs, str.slice(0,match[0].length + match.index));
            rs = obj.parentNode;
            rs.childNodes = rs.childNodes || [];
            pushTextNode(rs.childNodes, str.slice(0, match.index));
            rs.childNodes.push(obj);
            return matchEnd ? str.slice(matchEnd.index + 3) : null;
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
      typeof str === "string" && str.length > 0 &&
      arr.push({
        nodeName : "#text",
        nodeType : 3,
        nodeValue : str
      });
      /**
      !new RegExp("^" + blank + "*$").test(str) && arr.push({
        nodeName : "text",
        nodeType : 3,
        nodeValue : str
      });**/
    }
    function check(str){
      var match, m, item, len = tagStack.length, rs;
      expr["TAIL"].exp = new RegExp("\\<\\s*\\/\\s*(" + tagStack[len - 1] + ")\\s*\\>");
      for(var i in expr){
        m = expr[i]["exp"].exec(str);
        match = m ? (
          match ? (
            m.index < match.index ? ( item = expr[i], m ) : match
          ) : ( item = expr[i], m )
        ) : match;
      }
      rs = match
        ? item["handler"](str, match)
        : undefined
      return rs;
    }
    while(typeof (match = check(str)) !== "undefined"){
      str = match;
    };
    pushTextNode(root.childNodes, str);
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
          switch (typeof node.nodeName === "string" ? node.nodeName.toUpperCase() : "") {
            case "INPUT" :
              return format("<" + node.nodeName.toLowerCase() + params2String(node.attributes) + "/>", depth);
            default :
              return format("<" + node.nodeName.toLowerCase() + params2String(node.attributes) + ">", depth);
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
          switch (typeof node.nodeName === "string" ? node.nodeName.toUpperCase() : "") {
            case "INPUT" :
              return "";
            default :
              return format("</" + node.nodeName.toLowerCase() + ">", depth);
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
      for(var i = 0; i < (node.childNodes ? node.childNodes.length : 0); i++){
        str += recursive(node.childNodes[i], depth+1);
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