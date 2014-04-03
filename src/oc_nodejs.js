"use strict";

var language = require("eberon/eberon_grammar.js").language;
var nodejs = require("nodejs.js");

var options = {
    "--include": "includeDirs",
    "--out-dir": "outDir",
    "--import-dir": "importDir",
    "--timing": "timing"
};

function parseOption(a, result){
    for(var o in options){
        var optionPrefix = o + "=";
        if (a.indexOf(optionPrefix) === 0){
            result[options[o]] = a.substr(optionPrefix.length);
            return;
        }
    }
    result.notParsed.push(a);
}

function parseOptions(argv){
    var result = {notParsed: []};
    for(var i = 0; i < argv.length; ++i)
        parseOption(argv[i], result);
    return result;
}

function main(){
    var args = parseOptions(process.argv.splice(2));
    var sources = args.notParsed;
    if (!sources.length){
        console.info("Usage: <oc_nodejs> [options] <input oberon module file(s)>");
        console.info("options:\n--include=<search directories separated by ';'>\n--out-dir=<out dir>\n--import-dir=<import dir>");
        return -1;
    }
    var includeDirs = (args.includeDirs && args.includeDirs.split(";")) || [];
    var outDir = args.outDir || ".";

    var errors = "";
    var start = args.timing == "true" ? (new Date()).getTime() : undefined;
    nodejs.compile(sources, language, function(e){errors += e + "\n";}, includeDirs, outDir, args.importDir);
    if (errors.length){
        console.error(errors);
        return -2;
    }

    if (start){
        var stop = (new Date()).getTime();
        console.log("elapsed: " + (stop - start) / 1000 + " s" );
    }
    
    console.info("OK!");
    return 0;
}

// process.exit(main());
// hack to avoid problem with not flushed stdout on exit: https://github.com/joyent/node/issues/1669
var rc = main();
process.stdout.once("drain", function(){process.exit(rc);});
process.stdout.write("");
