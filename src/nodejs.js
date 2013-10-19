"use strict";

var Rtl = require("rtl.js");
var Code = require("code.js");
var Context = require("context.js");
var oc = require("oc.js");

var ModuleGenerator = Rtl.Class.extend({
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

function compile(text, handleErrors, handleCompiledModule){
    var rtl = new Rtl.RTL();
    var code = new Code.Generator();
    var moduleCode = function(name, imports){return new ModuleGenerator(name, imports);};

    oc.compileWithContext(
            text,
            function(moduleResolver){return new Context.Context(code, moduleCode, rtl, moduleResolver);},
            handleErrors,
            handleCompiledModule);

    var rtlCode = rtl.generate();
    if (rtlCode)
        handleCompiledModule(rtl.name(), rtlCode);
}

exports.compile = compile;
