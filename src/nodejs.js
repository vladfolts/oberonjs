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
            result += "var " + alias + " = require(\"" + name + ".js\");\n";
        }
        return result;
    },
    epilog: function(exports){
        var result = "";
        for(var access in exports){
            var e = exports[access];
            var code = Code.genExport(e);
            if (code){
                result += "exports." + e.id() + " = " + code + ";\n";
            }
        }
        return result;
    }
});

var RtlCodeUsingWatcher = Rtl.Code.extend({
    init: function(){
        Rtl.Code.prototype.init.call(this);
        this.__used = false;
    },
    get: function(func){
        this.__used = true;
        return Rtl.Code.prototype.get.call(this, func);
    },
    used: function(){return this.__used;},
    reset: function(){this.__used = false;}
});

function compile(text, handleErrors, handleCompiledModule){
    var rtlCodeWatcher = new RtlCodeUsingWatcher();
    var rtl = new Rtl.RTL(rtlCodeWatcher);
    var moduleCode = function(name, imports){return new ModuleGenerator(name, imports);};

    oc.compileWithContext(
            text,
            function(moduleResolver){return new Context.Context(
                new Code.Generator(),
                moduleCode,
                rtl,
                moduleResolver);},
            handleErrors,
            function(name, code){
                if (rtlCodeWatcher.used()){
                    code = "var RTL$ = require(\"RTL$.js\").RTL$;\n" + code;
                    rtlCodeWatcher.reset();
                }
                handleCompiledModule(name, code);
            });

    var rtlCode = rtl.generate();
    if (rtlCode){
        rtlCode += "\nexports." + rtl.name() + " = " + rtl.name() + ";";
        handleCompiledModule(rtl.name(), rtlCode);
    }
}

exports.compile = compile;
