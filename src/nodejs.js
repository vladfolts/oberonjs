"use strict";

var Class = require("rtl.js").Class;
var Code = require("js/Code.js");
var CodeGenerator = require("js/CodeGenerator.js");
var Errors = require("js/Errors.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var LanguageContext = require("js/LanguageContext.js");
var oc = require("oc.js");
var makeRTL = require("rtl_code.js").makeRTL;

var fs = require("fs");
var path = require("path");

var ModuleGenerator = Class.extend({
    init: function Nodejs$ModuleGenerator(name, imports, importDir){
        this.__name = name;
        this.__imports = imports;
        this.__importDir = importDir;
    },
    prolog: function(){
        var result = "";            
        var modules = this.__imports;
        for(var name in modules){
            var alias = modules[name];
            var importName = this.__importDir ? this.__importDir + "/" + name
                                              : name;
            result += "var " + CodeGenerator.mangleId(alias) + " = " + (name == "JS" 
                ? "GLOBAL"
                : "require(\"" + importName + ".js\")") + ";\n";
        }
        return result;
    },
    epilog: function(exports){
        var result = "";
        for(var access in exports){
            var e = exports[access];
            var code = Code.genExport(e);
            if (code){
                var id = Code.exportId(e);
                result += "exports." + id + " = " + code + ";\n";
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

function compile(sources, language, handleErrors, includeDirs, outDir, importDir){
    var rtlCodeWatcher = new RtlCodeUsingWatcher();
    var rtl = new makeRTL(language.rtl, rtlCodeWatcher.using.bind(rtlCodeWatcher));
    var moduleCode = function(name, imports){
        return new ModuleGenerator(name, imports, importDir);};

    return oc.compileModules(
            sources,
            function(name){
                var fileName = name;
                if (!path.extname(fileName).length)
                    fileName += ".ob";
                
                var readPath = fileName;
                var i = 0;
                while (!fs.existsSync(readPath) && i < includeDirs.length){
                    readPath = path.join(includeDirs[i], fileName);
                    ++i;
                }
                if (!fs.existsSync(readPath))
                    throw new Error("cannot find file: '" + fileName + "' in " + includeDirs);
                return new oc.ReadModule(
                    fs.readFileSync(readPath, "utf8"),
                    "File \"" + readPath + "\"");
            },
            language.grammar,
            function(moduleResolver){
                return new ContextHierarchy.Root(
                { codeTraits: language.makeCodeTraits(language.codeGenerator.make(), rtl),
                  moduleGenerator: moduleCode,
                  rtl: rtl,
                  types: language.types,
                  stdSymbols: language.stdSymbols,
                  moduleResolver: moduleResolver
                });},
            handleErrors,
            function(name, code){
                if (rtlCodeWatcher.used()){
                    code = "var " + rtl.name() + " = require(\"" + rtl.module() + "\");\n" + code;
                    rtlCodeWatcher.reset();
                }
                writeCompiledModule(name, code, outDir);
            });
}

exports.compile = compile;
