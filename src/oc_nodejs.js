"use strict";

var grammar = require("eberon/eberon_grammar.js").grammar;
var nodejs = require("nodejs.js");

var options = {
    "--out-dir": "outDir",
    "--import-dir": "importDir"
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
        console.info("options:\n--out-dir=<out dir>\n--import-dir=<import dir>");
        return -1;
    }
    var outDir = args.outDir || ".";

    var errors = "";
    nodejs.compile(sources, grammar, function(e){errors += e;}, outDir, args.importDir);
    if (errors.length){
        console.error(errors);
        return -2;
    }

    console.info("OK!");
    return 0;
}

process.exit(main());
