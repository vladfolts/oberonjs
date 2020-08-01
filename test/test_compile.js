"use strict";

var nodejs = require("nodejs.js");
var oc = require("oc");
var oberon = require("oberon/oberon_grammar.js").language;
var eberon = require("eberon/eberon_grammar.js").language;
var fs = require("fs");
var path = require("path");
var Test = require("test.js");

function normalizeLineEndings(text){
    return text.replace(/\r\n/g, '\n')
               .replace(/\s+$/,''); // ending spaces
}

function filterOutScopes(text){
    return text.replace(/.*\$scope =.+\n/g, "")
               .replace(/, \$scope\)/g, ")");
}

function filterOutRtlCode(text){
    var prefix = "var RTL$ = {";
    if (text.substr(0, prefix.length) != prefix)
        return text;
    
    var suffix = "\n};";
    var end = text.indexOf(suffix);
    if (end == -1)
        return text;
    return "<rtl code>" + text.substr(end + suffix.length);
}

function compareResults(result, name, dirs){
    result = filterOutRtlCode(result);
    result = filterOutScopes(result);
    fs.writeFileSync(path.join(dirs.output, name), result);
    var expected = fs.readFileSync(path.join(dirs.expected, name), "utf8");
    if (normalizeLineEndings(result) != normalizeLineEndings(expected))
        throw new Test.TestError("Failed");
}

function extractOptions(text){
    var match = text.match(/\(\*options:({.*})\*\)/);
    return match ? JSON.parse(match[1]) : null;
}

function readModule(src){
    var same_path_on_linux_and_win = src.replace(/\\/g, "/");
    return new oc.ReadModule(fs.readFileSync(src, "utf8"),
                             same_path_on_linux_and_win);
}

function compile(src, language){
    var module = readModule(src);
    var errors = "";
    var result = oc.compile(module, language, function(e){errors += e;},
                            extractOptions(module.content));
    if (errors)
        throw new Test.TestError(errors);
    return result;
}

function compileNodejs(src, dirs, language){
    language.rtl.nodejsModule = "test_rtl.js"; // make test results the same for oberon/eberon

    var subdir = path.basename(src);
    subdir = subdir.substr(0, subdir.length - path.extname(subdir).length);

    var outDir = path.join(dirs.output, subdir);
    fs.mkdirSync(outDir);

    var errors = "";
    nodejs.compile([src], language, function(e){errors += e;}, [], outDir);
    if (errors)
        throw new Test.TestError(errors);

    cmpDirs(path.join(dirs.expected, subdir), outDir);
}

function expectOk(src, dirs, grammar){
    var result = compile(src, grammar);
    var resultName = path.basename(src).replace(".ob", ".js");
    compareResults(result, resultName, dirs);
}

function expectError(src, dirs, language){
    var errors = "";
    try {
        oc.compile(readModule(src), language, function(e){errors += e + "\n";});
    }
    catch (e){
        errors += e;
    }
    if (!errors.length)
        throw new Test.TestError("compiler error expected");
    var resultName = path.basename(src).replace(".ob", ".txt");
    compareResults(errors, resultName, dirs);
}

function run(src, dirs, language){
    var result = compile(src, language);
    var resultName = path.basename(src).replace(".ob", ".js");
    var resultPath = path.join(dirs.output, resultName);
    fs.writeFileSync(resultPath, result);
    require(resultPath);
}

function expectRuntimeError(src, dirs, language){
    var error = "";
    try {
        run(src, dirs, language);
    }
    catch (x){
        error += x;
    }
    if (!error.length)
        throw new Test.TestError("runtime error expected");
    var resultName = path.basename(src).replace(".ob", ".txt");
    compareResults(error, resultName, dirs);
}

function makeTest(test, src, dirs, grammar){
    return function(){test(src, dirs, grammar);};
}

function makeTests(test, dirs, grammar){
    var output = dirs.output;
    if (fs.existsSync(output))
        rmTree(output);
    mkTree(output);

    var sources = fs.readdirSync(dirs.input);
    var tests = {};
    for(var i = 0; i < sources.length; ++i){
        var source = sources[i];
        var filePath = path.join(dirs.input, source);
        if (fs.statSync(filePath).isFile())
            tests[source] = makeTest(test, filePath, dirs, grammar);
    }
    return tests;
}

function mkTree(p){
    if (fs.existsSync(p))
        return;

    mkTree(path.dirname(p));
    fs.mkdirSync(p);
}

function rmTree(root){
    fs.readdirSync(root).forEach(function(file){
        var filePath = path.join(root, file);
        if (fs.statSync(filePath).isDirectory())
            rmTree(filePath);
        else
            fs.unlinkSync(filePath);
    });
    fs.rmdirSync(root);
}

function cmpDirs(expected, result){
    fs.readdirSync(expected).forEach(function(file){
        var expectedFile = path.join(expected, file);
        var resultFile = path.join(result, file);
        var expectedContent = fs.readFileSync(expectedFile, "utf8");
        var resultContent = fs.readFileSync(resultFile, "utf8");
        if (   normalizeLineEndings(expectedContent)
            != normalizeLineEndings(resultContent))
            throw new Test.TestError(
                "Files '" + expectedFile + "' and '"
                + resultFile + "' do not match.");
    });
}

var testDirs = {input: "input", output: "output", expected: "expected"};

function makeTestDirs(subdir){
    if (!subdir)
        return testDirs;

    var result = {};
    for(var p in testDirs)
        result[p] = path.join(testDirs[p], subdir);
    return result;
}

function outputSubdir(dirs, subdir){
    var result = {};
    for(var p in dirs)
        result[p] = (p == "output") ? path.join(dirs[p], subdir) : dirs[p];
    return result;
}

function main(){
    var okDirs = makeTestDirs();
    var errDirs = makeTestDirs("errors");
    var errRuntimeDirs = makeTestDirs("errorsRT");
    var runDirs = makeTestDirs("run");
    var nodejsDirs = makeTestDirs("nodejs");
    var oberonDirs = makeTestDirs("oberon");
    var eberonDirs = makeTestDirs("eberon");
    var eberonRunDirs = makeTestDirs("eberon/run");
    var eberonErrDirs = makeTestDirs("eberon/errors");

    function makeCommonTests(language, subdir){
        return {
            "expect OK": makeTests(expectOk, outputSubdir(okDirs, subdir), language),
            "expect compile error": makeTests(expectError, outputSubdir(errDirs, subdir), language),
            "expect runtime error": makeTests(expectRuntimeError, outputSubdir(errRuntimeDirs, subdir), language),
            "run": makeTests(run, outputSubdir(runDirs, subdir), language),
            "nodejs": makeTests(compileNodejs, outputSubdir(nodejsDirs, subdir), language)
        };
    }

    var result =
        Test.run({"common": {"oberon": makeCommonTests(oberon, "oberon"),
                             "eberon": makeCommonTests(eberon, "eberon")
                            },
                  "oberon": {"expect OK": makeTests(expectOk, oberonDirs, oberon)},
                  "eberon": {"expect OK": makeTests(expectOk, eberonDirs, eberon),
                             "run": makeTests(run, eberonRunDirs, eberon),
                             "expect compile error": makeTests(expectError, eberonErrDirs, eberon)
                            }
                 });
    return result ? 0 : -1;
}

process.exit(main());