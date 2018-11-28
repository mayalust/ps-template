const { html2json } = require("./ps-template.js");
var a = html2json(`
  asd<div scoped ng-repeat="item in repeats" style="color:red">
        <input type="radio"/>
        <div class="form-control">123</div>
      </div>def
`);
console.log(a);