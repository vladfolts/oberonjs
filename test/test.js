var oc = require('oc');
var fs = require('fs');

function normalizeLineEndings(text)
{
    return text.replace(/\r\n/g, '\n');
}

function run()
{
    var inputDir = "input";
    var outputDir = "output";
    if (!fs.existsSync(outputDir))
        fs.mkdirSync(outputDir);
    var sources = fs.readdirSync(inputDir);
    var failCount = 0;

    var start = Date.now();

    for(var i = 0; i < sources.length; ++i)
    {
        var source = sources[i];
        console.log(source + ":\t");
        var text = fs.readFileSync(inputDir + "/" + source, "utf8");
        var result = oc.compile(text);
        var resultName = source.replace(".ob", ".js");
        fs.writeFileSync(outputDir + "/" + resultName, result);
        var success = (normalizeLineEndings(result) == normalizeLineEndings(fs.readFileSync("expected/" + resultName, "utf8")));
        console.log(success ? "OK" : "Failed");
        if (!success)
            ++failCount;
    }
    console.log(sources.length + " tests" + (failCount ? ", " + failCount + " failed." : ""));

    var stop = Date.now();
    console.log("elapsed: " + (stop - start) / 1000 + " s" );

    if (!failCount)
        console.log("All OK!");
}

//try
{
    run();
}
//catch (x)
//{
 //   console.error(x);
//    console.error(x.stack);
//}