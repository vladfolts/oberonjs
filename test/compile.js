"use strict";

var oc = require("oc");
var fs = require("fs");
var path = require("path");

function compile(src){
    var text = fs.readFileSync(src, "utf8");
    var errors = "";
    var result = oc.compile(text, function(e){errors += "File \"" + src + "\", " + e;});
    if (errors){
        console.info(errors);
        return;
    }

    var fileName = path.basename(src);
    if (path.extname(fileName) != ".ob"){
        console.info(result);
        return;
    }

    fileName = fileName.substr(0, fileName.length - ".ob".length) + ".js";
    fs.writeFileSync(fileName, result);
    console.info("compiled to '" + fileName + "' - OK!");

}

function main(){
    if (process.argv.length < 2){
        console.info("compile.js <oberon source file path>");
        return;
    }

    compile(process.argv[2]);
}

main();