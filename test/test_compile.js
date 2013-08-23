"use strict";

var oc = require("oc");
var fs = require("fs");
var path = require("path");
var Test = require("test.js");

function normalizeLineEndings(text){
    return text.replace(/\r\n/g, '\n')
               .replace(/\s+$/,''); // ending spaces
}

function compareResults(result, name, dirs){
    fs.writeFileSync(dirs.output + "/" + name, result);
    var expected = fs.readFileSync(dirs.expected + "/" + name, "utf8");
    if (normalizeLineEndings(result) != normalizeLineEndings(expected))
        throw new Test.TestError("Failed");
}

function compile(src){
    var text = fs.readFileSync(src, "utf8");
    var errors = "";
    var result = oc.compile(text, function(e){errors += e;});
    if (errors)
        throw new Test.TestError(errors);
    return result;
}

function expectOk(src, dirs){
    var result = compile(src);
    var resultName = path.basename(src).replace(".ob", ".js");
    compareResults(result, resultName, dirs);
}

function expectError(src, dirs){
    var text = fs.readFileSync(src, "utf8");
    var errors = "";
    try {
        oc.compile(text, function(e){errors += e + "\n";});
    }
    catch (e){
        errors += e;
    }
    if (!errors.length)
        throw new Test.TestError("compiler error expected");
    var resultName = path.basename(src).replace(".ob", ".txt");
    compareResults(errors, resultName, dirs);
}

function run(src, dirs){
    eval(compile(src));
}

function makeTest(test, src, dirs){
    return function(){test(src, dirs);};
}

function makeTests(test, dirs){
    var sources = fs.readdirSync(dirs.input);
    var tests = {};
    for(var i = 0; i < sources.length; ++i){
        var source = sources[i];
        var path = dirs.input + "/" + source;
        if (fs.statSync(path).isFile())
            tests[source] = makeTest(test, path, dirs);
    }
    return tests;
}

function main(){
    if (process.argv.length > 2){
        var tests = {};
        var name = process.argv[2];
        tests[name] = function(){run(name);};
        Test.run(tests);
        return;
    }

    var okDirs = {input: "input", output: "output", expected: "expected"};
    var errDirs = {};
    var runDirs = {};
    var p;
    for(p in okDirs)
        errDirs[p] = okDirs[p] + "/errors";
    for(p in okDirs)
        runDirs[p] = okDirs[p] + "/run";

    if (!fs.existsSync(okDirs.output))
        fs.mkdirSync(okDirs.output);
    if (!fs.existsSync(errDirs.output))
        fs.mkdirSync(errDirs.output);
    if (!fs.existsSync(runDirs.output))
        fs.mkdirSync(runDirs.output);

    Test.run({"expect OK": makeTests(expectOk, okDirs),
              "expect compile error": makeTests(expectError, errDirs),
              "run": makeTests(run, runDirs)}
            );
}

main();