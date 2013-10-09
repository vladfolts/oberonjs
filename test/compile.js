"use strict";

var oc = require("oc");
var fs = require("fs");

function compile(src){
    var text = fs.readFileSync(src, "utf8");
    var errors = "";
    var result = oc.compile(text, function(e){errors += "File \"" + src + "\", " + e;});
    if (errors)
        console.info(errors);
    else
        console.info(result);
}

function main(){
    if (process.argv.length < 2){
        console.info("compile.js <oberon source file path>");
        return;
    }

    compile(process.argv[2]);
}

main();