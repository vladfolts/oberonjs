"use strict";

var Class = require("rtl.js").Class;
var Code = require("js/Code.js");
var Context = require("context.js");
var Errors = require("js/Errors.js");
var oc = require("oc.js");
var RTL = require("rtl_code.js").RTL;
var Scope = require("js/Scope.js");
var Stream = require("js/Stream.js");
var Test = require("test.js");

var TestError = Test.TestError;

function context(grammar, source){
    return {grammar: grammar, source: source};
}

function pass(/*...*/){return Array.prototype.slice.call(arguments);}

function fail(/*...*/){return Array.prototype.slice.call(arguments);}

var TestModuleGenerator = Class.extend({
    init: function TestModuleGenerator(){},
    prolog: function(){return undefined;},
    epilog: function(){return undefined;}
});

var TestContext = Context.Context.extend({
    init: function TestContext(language){
        Context.Context.prototype.init.call(
                this,
                { codeGenerator: Code.nullGenerator(),
                  moduleGenerator: function(){return new TestModuleGenerator();},
                  rtl: new RTL(),
                  types: language.types,
                  stdSymbols: language.stdSymbols
                });
        this.pushScope(Scope.makeModule("test", language.stdSymbols));
    },
    qualifyScope: function(){return "";}
});

function makeContext(language){return new TestContext(language);}

function testWithSetup(setup, pass, fail){
    return function(){
        var test = setup();
        var i;
        for(i = 0; i < pass.length; ++i)
            test.expectOK(pass[i]);
    
        if (fail)
            for(i = 0; i < fail.length; ++i){
                var f = fail[i];
                test.expectError(f[0], f[1]);
            }
    };
}

function parseInContext(grammar, s, context){
    var stream = Stream.make(s);
    if (!grammar(stream, context) || !Stream.eof(stream))
        throw new Errors.Error("not parsed");
}

function runAndHandleErrors(action, s, handlerError){
    try {
        action(s);
    }
    catch (x){
        if (!(x instanceof Errors.Error))
            throw new Error("'" + s + "': " + x + "\n" 
                            + (x.stack ? x.stack : "(no stack)"));
        
        if (handlerError)
            handlerError(x);
        //else
        //  throw x;
        //  console.log(s + ": " + x);
        return false;
    }
    return true;
}

function setup(run){
    return {
        expectOK: function(s){
            function handleError(e){throw new TestError(s + "\n\t" + e);}

            if (!runAndHandleErrors(run, s, handleError))
                throw new TestError(s + ": not parsed");
        },
        expectError: function(s, error){
            function handleError(actualError){
                var sErr = actualError.toString();
                if (sErr != error)
                    throw new TestError(s + "\n\texpected error: " + error + "\n\tgot: " + sErr );
            }

            if (runAndHandleErrors(run, s, handleError))
                throw new TestError(s + ": should not be parsed, expect error: " + error);
        }
    };
}

function parseUsingGrammar(parser, language, s, cxFactory){
    var baseContext = makeContext(language);
    var context = cxFactory ? cxFactory(baseContext) : baseContext;
    parseInContext(parser, s, context);
    context.currentScope().close();
}

function setupParser(parser, language, contextFactory){
    function parseImpl(s){
        return parseUsingGrammar(parser, language, s, contextFactory);
    }
    return setup(parseImpl);
}

function setupWithContext(grammar, contextGrammar, language, source){
    function innerMakeContext(){
        var context = makeContext(language);
        try {
            parseInContext(contextGrammar, source, context);
        }
        catch (x) {
            if (x instanceof Errors.Error)
                throw new TestError("setup error: " + x + "\n" + source);
            throw x;
        }
        return context;
    }

    return setupParser(grammar, language, innerMakeContext);
}

function testWithContext(context, contextGrammar, language, pass, fail){
    return testWithSetup(
        function(){return setupWithContext(context.grammar, contextGrammar, language, context.source);},
        pass,
        fail);
}

function testWithGrammar(parser, language, pass, fail){
    return testWithSetup(
        function(){return setupParser(parser, language);},
        pass,
        fail);
}

var TestContextWithModule = TestContext.extend({
    init: function(module, language){
        TestContext.prototype.init.call(this, language);
        this.__module = module;
    },
    findModule: function(){return this.__module;}
});

function testWithModule(src, language, pass, fail){
    var grammar = language.grammar;
    return testWithSetup(
        function(){
            var imported = oc.compileModule(grammar, Stream.make(src), makeContext(language));
            var module = imported.symbol().info();
            return setup(function(s){
                oc.compileModule(grammar,
                                 Stream.make(s),
                                 new TestContextWithModule(module, language));
            });},
        pass,
        fail);
}

exports.context = context;
exports.pass = pass;
exports.fail = fail;
exports.setupParser = setupParser;
exports.testWithContext = testWithContext;
exports.testWithGrammar = testWithGrammar;
exports.testWithModule = testWithModule;
exports.testWithSetup = testWithSetup;
