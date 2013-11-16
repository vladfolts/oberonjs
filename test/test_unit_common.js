"use strict";

var Class = require("rtl.js").Class;
var Code = require("code.js");
var Context = require("context.js");
var Errors = require("js/Errors.js");
var oc = require("oc.js");
var RTL = require("rtl_code.js").RTL;
var Scope = require("scope.js");
var Stream = require("Stream.js");
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
    init: function TestContext(){
        Context.Context.prototype.init.call(
                this,
                Code.nullGenerator,
                function(){return new TestModuleGenerator();},
                new RTL());
        this.pushScope(new Scope.Module("test"));
    },
    qualifyScope: function(){return "";}
});

function makeContext(){return new TestContext();}

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

function parseUsingGrammar(grammar, s, cxFactory){
    var baseContext = makeContext();
    var context = cxFactory ? cxFactory(baseContext) : baseContext;
    parseInContext(grammar, s, context);
}

function setupParser(parser, contextFactory){
    function parseImpl(s){
        return parseUsingGrammar(parser, s, contextFactory);
    }
    return setup(parseImpl);
}

function setupWithContext(grammar, contextGrammar, source){
    function innerMakeContext(){
        var context = makeContext();
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

    return setupParser(grammar, innerMakeContext);
}

function testWithContext(context, contextGrammar, pass, fail){
    return testWithSetup(
        function(){return setupWithContext(context.grammar, contextGrammar, context.source);},
        pass,
        fail);
}

function testWithGrammar(grammar, pass, fail){
    return testWithSetup(
        function(){return setupParser(grammar);},
        pass,
        fail);
}

var TestContextWithModule = TestContext.extend({
    init: function(module){
        TestContext.prototype.init.call(this);
        this.__module = module;
    },
    findModule: function(){return this.__module;}
});

function testWithModule(src, grammar, pass, fail){
    return testWithSetup(
        function(){
            var imported = oc.compileModule(grammar, Stream.make(src), makeContext());
            var module = imported.symbol().info();
            return setup(function(s){
                oc.compileModule(grammar,
                                 Stream.make(s),
                                 new TestContextWithModule(module));
            });},
        pass,
        fail);
}

exports.context = context;
exports.pass = pass;
exports.fail = fail;
exports.makeContext = makeContext;
exports.setupParser = setupParser;
exports.testWithContext = testWithContext;
exports.testWithGrammar = testWithGrammar;
exports.testWithModule = testWithModule;
exports.testWithSetup = testWithSetup;
