"use strict";

// NODE_PATH must contain the localized compiler directory and src.
var assert = require("assert");
var vm = require("vm");
var runtime = require("eberon/eberon_rtl.js");
var makeRTL = require("rtl_code.js").makeRTL;
var ru = process.argv[2] === "ru";
function Source(){}
function Target(){}
var cases = [
    ["charAt", ["a", 1], "index out of bounds: 1", "индекс за границей: 1"],
    ["getAt", [[0], -1], "index out of bounds: -1", "индекс за границей: -1"],
    ["putAt", [[0], 1, 2], "index out of bounds: 1", "индекс за границей: 1"],
    ["assert", [false], "assertion failed", "нарушено условие ASSERT"],
    ["makeSet", [32], "integers between 0 and 31 expected, got 32", "ожидается целое число от 0 до 31, получено 32"],
    ["makeSet", [[2, 1]], "invalid SET diapason: 2..1", "недопустимый диапазон SET: 2..1"],
    ["getMappedValue", [{}, "missing"], "invalid key: missing", "недопустимый ключ: missing"],
    ["typeGuard", [new Source(), Target], "cannot cast to 'Target' from 'Source'", "невозможно выполнить приведение типа к 'Target' из 'Source'"]
];
var definition = {methods: runtime.rtl.methods, dependencies: runtime.rtl.dependencies,
                  base: require("js/EberonRtl.js").Type};
var generator = makeRTL(definition);
cases.forEach(function(test){generator[test[0] + "Id"]();});
// No require or compiler objects are supplied to the generated runtime.
var generated = vm.runInNewContext(generator.generate() + "RTL$;", {Array: Array});
[runtime, generated].forEach(function(rtl){
    cases.forEach(function(test){
        var message;
        try {rtl[test[0]].apply(rtl, test[1]);}
        catch (e) {message = e.message;}
        assert.strictEqual(message, test[ru ? 3 : 2], test[0]);
    });
});
var oc = require("oc.js");
var language = require("oberon/oberon_grammar.js").language;
[
    ["MODULE m; BEGIN ASSERT(FALSE) END m.", cases[3]],
    ["MODULE m; VAR a: ARRAY 1 OF INTEGER; i: INTEGER; BEGIN i := 1; DEC(a[i]) END m.", cases[2]]
].forEach(function(test){
    var code = oc.compile(new oc.ReadModule(test[0], "runtime.ob"), language,
        function(e){throw new Error(e);}, {checkIndexes: true});
    var message;
    try {vm.runInNewContext(code);}
    catch (e) {message = e.message;}
    assert.strictEqual(message, test[1][ru ? 3 : 2]);
});
console.log("18 runtime localization tests passed (" + (ru ? "ru" : "en") + ")");
