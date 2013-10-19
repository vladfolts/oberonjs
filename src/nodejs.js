"use strict";

var Class = require("rtl.js").Class;
var Code = require("code.js");

var ModuleGenerator = Class.extend({
    init: function Nodejs$ModuleGenerator(name, imports){
        this.__name = name;
        this.__imports = imports;
    },
    prolog: function(){
        var result = "";            
        var modules = this.__imports;
        for(var name in modules){
            var alias = modules[name];
            result += "var " + alias + " = require(" + name + ".js);\n";
        }
        return result;
    },
    epilog: function(exports){
        var result = "";
        for(var access in exports){
            var e = exports[access];
            var code = Code.genExport(e);
            if (code){
                result += "exports." + e.id() + " = " + code + "\n";
            }
        }
        return result;
    }
});

exports.ModuleGenerator = ModuleGenerator;