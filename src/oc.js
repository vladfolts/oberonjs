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

function compileModulesFromText(
        text,
        contextFactory,
        resolveModule,
        handleCompiledModule,
        handleErrors){
    var stream = new Stream(text);
    do {
        var context = contextFactory(resolveModule);
        var module = compileModule(stream, context, handleErrors);
        if (!module)
            return;
        handleCompiledModule(module);
        Lexer.skipSpaces(stream);
    }
    while (!stream.eof());
}

var ModuleResolver = Class.extend({
    init: function Oc$ModuleResolver(compile, handleCompiledModule, moduleReader){
        this.__modules = {};
        this.__compile = compile;
        this.__moduleReader = moduleReader;
        this.__handleCompiledModule = handleCompiledModule;
    },
    compile: function(text){
        this.__compile(text, this.__resolveModule.bind(this), this.__handleModule.bind(this));
    },
    __resolveModule: function(name){
        if (this.__moduleReader && !this.__modules[name])
            this.compile(this.__moduleReader(name));
        return this.__modules[name];
    },
    __handleModule: function(module){
        var symbol = module.symbol();
        var moduleName = symbol.id();
        this.__modules[moduleName] = symbol.info();
        this.__handleCompiledModule(moduleName, module.code());
    }
});

function makeResolver(contextFactory, handleCompiledModule, handleErrors, moduleReader){
    return new ModuleResolver(
        function(text, resolveModule, handleModule){
            compileModulesFromText(text,
                                   contextFactory,
                                   resolveModule,
                                   handleModule,
                                   handleErrors);
        },
        handleCompiledModule,
        moduleReader
        );
}

function compileModules(names, moduleReader, contextFactory, handleErrors, handleCompiledModule){
    var resolver = makeResolver(contextFactory, handleCompiledModule, handleErrors, moduleReader);
    names.forEach(function(name){ resolver.compile(moduleReader(name)); });
}

function compile(text, handleErrors){
    var result = "";
    var rtl = new RTL();
    var moduleCode = function(name, imports){return new Code.ModuleGenerator(name, imports);};
    var resolver = makeResolver(
            function(moduleResolver){
                return new Context.Context(new Code.Generator(),
                                           moduleCode,
                                           rtl,
                                           moduleResolver);
            },
            function(name, code){result += code;},
            handleErrors
            );
    resolver.compile(text);

    var rtlCode = rtl.generate();
    if (rtlCode)
        result = rtlCode + result;
    return result;
}

exports.compileModule = compileModule;
exports.compile = compile;
exports.compileModules = compileModules;