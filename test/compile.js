"use strict";

var oc = require("oc");
var fs = require("fs");
var rtl = require("rtl.js");
var Stream = require("stream.js").Stream;
var Class = rtl.Class;

var Compiler = Class.extend({
    init: function Compiler(){
        this.__rtl = new rtl.RTL();
        this.__code = "";
        this.__errors = "";
        this.__modules = {};
    },
    addFile: function(file){
        console.info("compiling '" + file + "...")
        var text = fs.readFileSync(file, "utf8");
        var stream = new Stream(text);
        var module = oc.compileModule(
              stream,
              this.__rtl,
              this.__resolveModule.bind(this),
              function(e){this.__handleErrors(file, e);}.bind(this)
              );
        if (!module)
            return undefined;

        this.__code += module.code();

        var symbol = module.symbol();
        this.__modules[symbol.id()] = symbol.info();
        return symbol.info();
    },
    code: function(){return this.__rtl.generate() + this.__code;},
    errors: function(){return this.__errors;},
    __resolveModule: function(name){
        var compiled = this.__modules[name];
        if (compiled)
            return compiled;

        var fileName = name + ".ob";
        return this.addFile(fileName);
    },
    __handleErrors: function(file, e){
        this.__errors += "File \"" + file + "\", " + e;
    }
});

function compile(src){
    var compiler = new Compiler();
    compiler.addFile(src);
    var errors = compiler.errors();
    if (errors){
        console.info(errors);
        return;
    }

    var fileName = "a.js";
    fs.writeFileSync(fileName, compiler.code());
    console.info("compiled to '" + fileName + "' - OK!");

}

function main(){
    if (process.argv.length < 2){
        console.info("compile.js <oberon source file path>");
        return;
    }

    compile(process.argv[2]);
}

main();