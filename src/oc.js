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

function compileModule(stream, rtl, moduleResolver, handleErrors){
    var code = new Code.Generator();
    var context = new Context.Context(code, rtl, moduleResolver);
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
    return new CompiledModule(scope.module(), code.getResult(), scope.exports());
}

function compile(text, handleErrors){
    var stream = new Stream(text);
    var rtl = new RTL();
    var code = "";
    var modules = {};
    function resolveModule(name){return modules[name];}

    do {
        var module = compileModule(stream, rtl, resolveModule, handleErrors);
        if (!module)
            return undefined;
        var symbol = module.symbol();
        modules[symbol.id()] = symbol.info();
        code += module.code();
        Lexer.skipSpaces(stream);
    } 
    while (!stream.eof());
    return rtl.generate() + code;
}

exports.compileModule = compileModule;
exports.compile = compile;
