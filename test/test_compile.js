var oc = require("oc");
var fs = require("fs");
var path = require("path");
var Test = require("test.js");

function normalizeLineEndings(text){
    return text.replace(/\r\n/g, '\n');
}

function compareResults(result, name, dirs){
    fs.writeFileSync(dirs.output + "/" + name, result);
    var expected = fs.readFileSync(dirs.expected + "/" + name, "utf8");
    if (normalizeLineEndings(result) != normalizeLineEndings(expected))
        throw new Test.TestError("Failed");
}

function expectOk(src, dirs){
    var text = fs.readFileSync(src, "utf8");
    var result = oc.compile(text);
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

var okDirs = {input: "input", output: "output", expected: "expected"};
var errDirs = {};
for(var p in okDirs)
    errDirs[p] = okDirs[p] + "/errors";

if (!fs.existsSync(okDirs.output))
    fs.mkdirSync(okDirs.output);
if (!fs.existsSync(errDirs.output))
    fs.mkdirSync(errDirs.output);

Test.run({"expect OK": makeTests(expectOk, okDirs),
          "expect compile error": makeTests(expectError, errDirs)}
        );
