"use strict";

var grammar = require("eberon/eberon_grammar.js").grammar;
var nodejs = require("nodejs.js");

function main(){
    if (process.argv.length <= 3){
        console.info("Usage: <oc_nodejs> <output dir> <input oberon module file(s)>");
        return -1;
    }

    var outDir = process.argv[2];
    var sources = process.argv.slice(3);
    var errors = "";
    nodejs.compile(sources, grammar, function(e){errors += e;}, outDir);
    if (errors.length){
        console.error(errors);
        return -2;
    }

    console.info("OK!");
    return 0;
}

process.exit(main());
