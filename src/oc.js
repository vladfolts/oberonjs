"use strict";

var Class = require("rtl.js").Class;
var Code = require("js/Code.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var Errors = require("js/Errors.js");
var LanguageContext = require("js/LanguageContext.js");
var Lexer = require("js/Lexer.js");
var makeRTL = require("rtl_code.js").makeRTL;
var Scope = require("js/Scope.js");
var Stream = require("js/Stream.js");

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

function compileModule(grammar, stream, context, handleErrors){
    Lexer.skipSpaces(stream, context);  
    try {
        if (!grammar.module(stream, context))
            throw new Errors.Error("syntax error");
    }
    catch (x) {
        if (x instanceof Errors.Error) {
            if (handleErrors){
                handleErrors("line " + Stream.lineNumber(stream) + ": " + x);
                return undefined;
            }
        }
        if (x.message)
            x.message = "internal compiler error while parsing line " + Stream.lineNumber(stream) + ": " + Stream.currentLine(stream) + "\n" + x.message;
        throw x;
    }
    var scope = context.root().currentScope();
    return new CompiledModule(
            Scope.moduleSymbol(scope),
            context.codeGenerator().result(),
            scope.exports);
}

function compileModulesFromText(
        text,
        grammar,
        contextFactory,
        resolveModule,
        handleCompiledModule,
        handleErrors){
    var stream = new Stream.Type(text);
    do {
        var context = contextFactory(resolveModule);
        var module = compileModule(grammar, stream, context, handleErrors);
        if (!module)
            return;
        handleCompiledModule(module);
        Lexer.skipSpaces(stream, context);
    }
    while (!Stream.eof(stream));
}

var ModuleResolver = Class.extend({
    init: function Oc$ModuleResolver(compile, handleCompiledModule, moduleReader, handleErrors){
        this.__modules = {};
        this.__compile = compile;
        this.__moduleReader = moduleReader;
        this.__handleCompiledModule = handleCompiledModule;
        this.__handleErrors = handleErrors;
        this.__detectRecursion = [];
    },
    compile: function(text){
        this.__compile(text, this.__resolveModule.bind(this), this.__handleModule.bind(this));
    },
    __resolveModule: function(name){
        if (this.__moduleReader && !this.__modules[name]){
            if (this.__detectRecursion.indexOf(name) != -1){
                this.__handleErrors("recursive import: " + this.__detectRecursion.join(" -> "));
                return undefined;
            }
            this.__detectRecursion.push(name);

            try {
                this.compile(this.__moduleReader(name));
            }
            finally {
                this.__detectRecursion.pop();
            }
        }
        return this.__modules[name];
    },
    __handleModule: function(module){
        var symbol = module.symbol();
        var moduleName = symbol.id();
        this.__modules[moduleName] = symbol.info();
        this.__handleCompiledModule(moduleName, module.code());
    }
});

function makeResolver(grammar, contextFactory, handleCompiledModule, handleErrors, moduleReader){
    return new ModuleResolver(
        function(text, resolveModule, handleModule){
            compileModulesFromText(text,
                                   grammar,
                                   contextFactory,
                                   resolveModule,
                                   handleModule,
                                   handleErrors);
        },
        handleCompiledModule,
        moduleReader,
        handleErrors
        );
}

function compileModules(names, moduleReader, grammar, contextFactory, handleErrors, handleCompiledModule){
    var resolver = makeResolver(grammar, contextFactory, handleCompiledModule, handleErrors, moduleReader);
    names.forEach(function(name){ resolver.compile(moduleReader(name)); });
}

function compile(text, language, handleErrors, options){
    var result = "";
    var rtl = new makeRTL(language.rtl);
    var moduleCode = function(name, imports){return new Code.ModuleGenerator(name, imports);};
    var resolver = makeResolver(
            language.grammar,
            function(moduleResolver){
                return new ContextHierarchy.Root(
                    { codeTraits: new LanguageContext.CodeTraits(language.codeGenerator.make(), 
                                                                 options && options.checkIndexes ? rtl : null),
                      moduleGenerator: moduleCode,
                      rtl: rtl,
                      types: language.types,
                      stdSymbols: language.stdSymbols,
                      moduleResolver: moduleResolver
                    });
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