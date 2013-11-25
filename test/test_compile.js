"use strict";

var nodejs = require("nodejs");
var oc = require("oc");
var oberonGrammar = require("oberon/oberon_grammar.js").grammar;
var eberonGrammar = require("eberon/eberon_grammar.js").grammar;
var fs = require("fs");
var path = require("path");
var Test = require("test.js");

function normalizeLineEndings(text){
    return text.replace(/\r\n/g, '\n')
               .replace(/\s+$/,''); // ending spaces
}

function compareResults(result, name, dirs){
    fs.writeFileSync(path.join(dirs.output, name), result);
    var expected = fs.readFileSync(path.join(dirs.expected, name), "utf8");
    if (normalizeLineEndings(result) != normalizeLineEndings(expected))
        throw new Test.TestError("Failed");
}

function compile(src, grammar){
    var text = fs.readFileSync(src, "utf8");
    var errors = "";
    var result = oc.compile(text, grammar, function(e){errors += e;});
    if (errors)
        throw new Test.TestError(errors);
    return result;
}

function compileNodejs(src, dirs, grammar){
    var subdir = path.basename(src);
    subdir = subdir.substr(0, subdir.length - path.extname(subdir).length);

    var outDir = path.join(dirs.output, subdir);
    fs.mkdirSync(outDir);

    var errors = "";
    nodejs.compile([src], grammar, function(e){errors += e;}, outDir);
    if (errors)
        throw new Test.TestError(errors);

    cmpDirs(path.join(dirs.expected, subdir), outDir);
}

function expectOk(src, dirs, grammar){
    var result = compile(src, grammar);
    var resultName = path.basename(src).replace(".ob", ".js");
    compareResults(result, resultName, dirs);
}

function expectError(src, dirs, grammar){
    var text = fs.readFileSync(src, "utf8");
    var errors = "";
    try {
        oc.compile(text, grammar, function(e){errors += e + "\n";});
    }
    catch (e){
        errors += e;
    }
    if (!errors.length)
        throw new Test.TestError("compiler error expected");
    var resultName = path.basename(src).replace(".ob", ".txt");
    compareResults(errors, resultName, dirs);
}

function run(src, dirs, grammar){
    var result = compile(src, grammar);
    var resultName = path.basename(src).replace(".ob", ".js");
    var resultPath = path.join(dirs.output, resultName);
    fs.writeFileSync(resultPath, result);
    require(resultPath);
}

function makeTest(test, src, dirs, grammar){
    return function(){test(src, dirs, grammar);};
}

function makeTests(test, dirs, grammar){
    var output = dirs.output;
    if (fs.existsSync(output))
        rmTree(output);
    fs.mkdirSync(output);

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
    var runDirs = makeTestDirs("run");
    var nodejsDirs = makeTestDirs("nodejs");
    var eberonDirs = makeTestDirs("eberon");
    var eberonRunDirs = makeTestDirs("eberon/run");

    function makeCommonTests(grammar, subdir){
        return {
            "expect OK": makeTests(expectOk, outputSubdir(okDirs, subdir), grammar),
            "expect compile error": makeTests(expectError, outputSubdir(errDirs, subdir), grammar),
            "run": makeTests(run, outputSubdir(runDirs, subdir), grammar),
            "nodejs": makeTests(compileNodejs, outputSubdir(nodejsDirs, subdir), grammar)
        };
    }

    Test.run({"common": {"oberon": makeCommonTests(oberonGrammar, "oberon"),
                         "eberon": makeCommonTests(eberonGrammar, "eberon")
                        },
              "eberon": {"expect OK": makeTests(expectOk, eberonDirs, eberonGrammar),
                         "run": makeTests(run, eberonRunDirs, eberonGrammar)
                        }
             });
}

main();