"use strict";

var Code = require("code.js");
var Context = require("context.js");
var Errors = require("errors.js");
var Grammar = require("grammar.js");
var Lexer = require("lexer.js");
var ImportRTL = require("rtl.js");
var Stream = require("stream.js").Stream;

var RTL = ImportRTL.RTL;
var Class = ImportRTL.Class;

var CompiledModule = Class.extend({
    init: function CompiledModule(symbol, code, exports){
        this.__symbol = symbol;
        this.__code = code;
        this.__exports = exports;
    },
    symbol: function(){return this.__symbol;},
    code: function(){return this.__code;},
    exports: function(){return this.__exports;}
});

function compileModule(stream, context, handleErrors){
    Lexer.skipSpaces(stream, context);  
    try {
        if (!Grammar.module(stream, context))
            throw new Errors.Error("syntax error");
    }
    catch (x) {
        if (x instanceof Errors.Error) {
            //console.log(context.getResult());
            if (handleErrors){
                handleErrors(stream.describePosition() + ": " + x);
                return undefined;
            }
        }
        throw x;
    }
    var scope = context.currentScope();
    return new CompiledModule(
            scope.module(),
            context.codeGenerator().getResult(),
            scope.exports());
}

function compileWithContext(text, contextFactory, handleErrors, handleCompiledModule){
    var stream = new Stream(text);
    var modules = {};
    function resolveModule(name){return modules[name];}

    do {
        var context = contextFactory(resolveModule);
        var module = compileModule(stream, context, handleErrors);
        if (!module)
            return;
        var symbol = module.symbol();
        var moduleName = symbol.id();
        modules[moduleName] = symbol.info();
        handleCompiledModule(moduleName, module.code());
        Lexer.skipSpaces(stream);
    } 
    while (!stream.eof());
}

function compile(text, handleErrors){
    var result = "";
    var rtl = new RTL();
    var moduleCode = function(name, imports){return new Code.ModuleGenerator(name, imports);};
    compileWithContext(
            text,
            function(moduleResolver){
                return new Context.Context(new Code.Generator(),
                                           moduleCode,
                                           rtl,
                                           moduleResolver);
            },
            handleErrors,
            function(name, code){result += code;});

    var rtlCode = rtl.generate();
    if (rtlCode)
        result = rtlCode + result;
    return result;
}

exports.compileModule = compileModule;
exports.compile = compile;
exports.compileWithContext = compileWithContext;