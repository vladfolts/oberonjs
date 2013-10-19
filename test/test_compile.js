"use strict";

var nodejs = require("nodejs");
var oc = require("oc");
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

function compile(src){
    var text = fs.readFileSync(src, "utf8");
    var errors = "";
    var result = oc.compile(text, function(e){errors += e;});
    if (errors)
        throw new Test.TestError(errors);
    return result;
}

function compileNodejs(src, dirs){
    var text = fs.readFileSync(src, "utf8");
    
    var subdir = path.basename(src);
    subdir = subdir.substr(0, subdir.length - path.extname(subdir).length);

    var outDir = path.join(dirs.output, subdir);
    fs.mkdirSync(outDir);

    var errors = "";
    nodejs.compile(text,
                   function(e){errors += e;},
                   function(name, code){
                        var filePath = path.join(outDir, name + ".js");
                        fs.writeFileSync(filePath, code);
                     }
                    );
    if (errors)
        throw new Test.TestError(errors);
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
        var filePath = path.join(dirs.input, source);
        if (fs.statSync(filePath).isFile())
            tests[source] = makeTest(test, filePath, dirs);
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
    var nodejsDirs = {};
    var p;
    for(p in okDirs){
        errDirs[p] = path.join(okDirs[p], "errors");
        runDirs[p] = path.join(okDirs[p], "run");
        nodejsDirs[p] = path.join(okDirs[p], "nodejs");
    }

    var dirsSet = [okDirs, errDirs, runDirs, nodejsDirs];
    for(var i = 0; i < dirsSet.length; ++i){
        var output = dirsSet[i].output;
        if (fs.existsSync(output))
            rmTree(output);
        fs.mkdirSync(output);
    }

    Test.run({"expect OK": makeTests(expectOk, okDirs, compile),
              "expect compile error": makeTests(expectError, errDirs),
              "run": makeTests(run, runDirs),
              "nodejs": makeTests(compileNodejs, nodejsDirs)}
            );
}

main();