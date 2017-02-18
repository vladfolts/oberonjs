"use strict";

var Class = require("rtl.js").Class;
var Code = require("js/Code.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var ContextType = require("js/ContextType.js");
var Errors = require("js/Errors.js");
var LanguageContext = require("js/LanguageContext.js");
var oc = require("oc.js");
var makeRTL = require("rtl_code.js").makeRTL;
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

var TestContextRoot = Class.extend.call(ContextHierarchy.Root, {
    init: function TestContextRoot(language, moduleResolver){
        var rtl = new makeRTL(language.rtl);
        ContextHierarchy.Root.call(
                this,
                { codeTraits: language.makeCodeTraits(language.codeGenerator.nil, rtl),
                  moduleGenerator: function(){return new TestModuleGenerator();},
                  rtl: rtl,
                  types: language.types,
                  stdSymbols: language.stdSymbols,
                  moduleResolver: moduleResolver
                });
        this.pushScope(new Scope.Module("test", language.stdSymbols));
    },
    qualifyScope: function(){return "";},
    handleMessage: function(msg){
        if (msg instanceof ContextType.DescribeScopeMsg)
            msg.result = new ContextType.ScopeInfo("test", 0);
    },
    handleLiteral: function(){}
});

var TestContext = Class.extend.call(ContextExpression.ExpressionHandler, {
    init: function TestContext(language, moduleResolver){
        ContextExpression.ExpressionHandler.call(this, new TestContextRoot(language, moduleResolver));
    },
    handleExpression: function(){}
});

function makeContext(language, moduleResolver){return new TestContext(language, moduleResolver);}

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
    var stream = new Stream.Type(s);
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
    if (context.root)
        context.root().currentScope().close();
}

function setupParser(parser, language, contextFactory){
    function parseImpl(s){
        return parseUsingGrammar(parser, language, s, contextFactory);
    }
    return setup(parseImpl);
}

function compileModule(src, language){
    var imported = oc.compileModule(language.grammar, new Stream.Type(src), makeContext(language));
    return imported.symbol().info();
}

function makeModuleResolver(moduleReader, language){
    return moduleReader ? function(name){ return compileModule(moduleReader(name), language); }
                        : undefined;
}

function setupWithContext(fixture, contextGrammar, language){
    function innerMakeContext(){
        var context = makeContext(language, makeModuleResolver(fixture.moduleReader, language));
        var source = fixture.source;
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

    return setupParser(fixture.grammar, language, innerMakeContext);
}

function testWithContext(fixture, contextGrammar, language, pass, fail){
    return testWithSetup(
        setupWithContext.bind(undefined, fixture, contextGrammar, language),
        pass,
        fail);
}

function testWithGrammar(parser, language, pass, fail){
    return testWithSetup(
        function(){return setupParser(parser, language);},
        pass,
        fail);
}

function testWithModule(src, language, pass, fail){
    var grammar = language.grammar;
    return testWithSetup(
        function(){
            var module = compileModule(src, language);
            return setup(function(s){
                oc.compileModule(grammar,
                                 new Stream.Type(s),
                                 new TestContext(language, function(){return module;}));
            });},
        pass,
        fail);
}

function nthLine(s, n){
    var result = 0;
    while (n--)
        result = s.indexOf('\n', result) + 1;
    return result;
}

function assert(cond){
    if (!cond){
        var stack = new Error().stack;
        var from = nthLine(stack, 2);
        stack = stack.substring(from, stack.indexOf('\n', from));
        throw new TestError("assertion failed: " + stack);
    }
}

function expectEq(x1, x2){
    if (x1 == x2)
        return;

    throw new TestError("'" + x1 + "' != '" + x2 + "'");
    }

exports.assert = assert;
exports.expectEq = expectEq;

exports.context = context;
exports.pass = pass;
exports.fail = fail;
exports.setupParser = setupParser;
exports.testWithContext = testWithContext;
exports.testWithGrammar = testWithGrammar;
exports.testWithModule = testWithModule;
exports.testWithSetup = testWithSetup;
