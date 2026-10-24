"use strict";

// Run with NODE_PATH=<localized compiler directory>:src and argument en or ru.
var assert = require("assert");
var oc = require("oc.js");
var oberon = require("oberon/oberon_grammar.js").language;
var eberon = require("eberon/eberon_grammar.js").language;
var ru = process.argv[2] === "ru";
var cases = [
    [oberon, 'MODULE test;\nIMPORT JS;\nBEGIN\n    JS.alert("Hello, World!"\nEND test.',
     "line 5: no matched ')'", "строка 5: нет соответствующей закрывающей скобки ')'"],
    [eberon, 'MODULE test;\nIMPORT JS;\nBEGIN\n    JS.alert("Hello, World!"\nEND test.',
     "line 5: no matched ')'", "строка 5: нет соответствующей закрывающей скобки ')'"],
    [oberon, "MODULE m;\nBEGIN\n\n- END m.",
     "line 4: END expected (MODULE)", "строка 4: ожидается END для MODULE"],
    [oberon, "MODULE m BEGIN END m.",
     "line 1: syntax error", "строка 1: синтаксическая ошибка"],
    [oberon, "MODULE m; BEGIN IF TRUE END END m.",
     "line 1: THEN expected", "строка 1: ожидается THEN"],
    [eberon, "MODULE m; BEGIN v <- END m.",
     "line 1: initialization expression expected", "строка 1: ожидается выражение инициализации"],
    [eberon, "MODULE m; VAR i: INTEGER; BEGIN i := TRUE ? 1 END m.",
     'line 1: expected ":" after "?" in ternary operator',
     'строка 1: ожидается ":" после "?" в условном выражении']
];
[oberon, eberon].forEach(function(language){
    [
        "MODULE m;\nIMPORT JS\nBEGIN END m.",
        "MODULE m;\nIMPORT Native := JS\nCONST n = 1; END m.",
        "MODULE m;\nCONST n = 1\nBEGIN END m.",
        "MODULE m;\nCONST n = 1\nother = 2; END m.",
        "MODULE m;\nVAR n: INTEGER\nBEGIN END m.",
        "MODULE m;\nVAR n: INTEGER\nother: INTEGER; END m.",
        "MODULE m; PROCEDURE p;\nCONST n = 1\nVAR i: INTEGER; END p; END m.",
        "MODULE m; PROCEDURE p;\nVAR n: INTEGER\nBEGIN END p; END m."
    ].forEach(function(source){
        cases.push([language, source,
            "line 3: ';' expected", "строка 3: ожидается ';'"]);
    });
    cases.push([language,
        "MODULE Init;\n\n\n\nPROCEDURE Do;\n VAR a: ARRAY 1 OF INTEGER;\nBEGIN\n a[0] := 1\n INC(a[0]);\nEND Do;\nBEGIN Do END Init.",
        "line 9: ';' expected", "строка 9: ожидается ';'"]);
    ["IF TRUE THEN END", "WHILE FALSE DO END", "REPEAT UNTIL TRUE",
     "FOR i := 0 TO 1 DO END", "CASE i OF 0: END"].forEach(function(statement){
        cases.push([language,
            "MODULE m; VAR i: INTEGER; BEGIN i := 1\n" + statement + " END m.",
            "line 2: ';' expected", "строка 2: ожидается ';'"]);
    });
});
cases.forEach(function(test){
    var errors = [];
    oc.compile(new oc.ReadModule(test[1], "example.ob"), test[0], function(e){errors.push(e);});
    assert.deepStrictEqual(errors, ["example.ob, " + test[ru ? 3 : 2]]);
});
console.log(cases.length + " localization tests passed (" + (ru ? "ru" : "en") + ")");
