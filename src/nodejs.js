"use strict";

var Class = require("rtl.js").Class;
var Code = require("code.js");
var Context = require("context.js");
var oc = require("oc.js");
var RTL = require("rtl_code.js").RTL;

var fs = require("fs");
var path = require("path");

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
            result += "var " + alias + " = " + (name == "this" 
                ? "GLOBAL"
                : "require(\"" + name + ".js\")") + ";\n";
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

var RtlCodeUsingWatcher = Class.extend({
    init: function(){this.__used = false;},
    using: function(){this.__used = true;},
    used: function(){return this.__used;},
    reset: function(){this.__used = false;}
});

function writeCompiledModule(name, code, outDir){
    var filePath = path.join(outDir, name + ".js");
    fs.writeFileSync(filePath, code);
    }

function compile(sources, grammar, handleErrors, outDir){
    var rtlCodeWatcher = new RtlCodeUsingWatcher();
    var rtl = new RTL(rtlCodeWatcher.using.bind(rtlCodeWatcher));
    var moduleCode = function(name, imports){return new ModuleGenerator(name, imports);};

    var compiledFilesStack = [];
    oc.compileModules(
            sources,
            function(name){
                var fileName = name;
                if (!path.extname(fileName).length)
                    fileName += ".ob";
                compiledFilesStack.push(fileName);
                return fs.readFileSync(fileName, "utf8");
            },
            grammar,
            function(moduleResolver){return new Context.Context(
                new Code.Generator(),
                moduleCode,
                rtl,
                moduleResolver);},
            function(e){handleErrors("File \"" + compiledFilesStack[compiledFilesStack.length - 1] + "\", " + e);},
            function(name, code){
                if (rtlCodeWatcher.used()){
                    code = "var " + rtl.name() + " = require(\"rtl.js\");\n" + code;
                    rtlCodeWatcher.reset();
                }
                writeCompiledModule(name, code, outDir);
                compiledFilesStack.pop();
            });
}

exports.compile = compile;
