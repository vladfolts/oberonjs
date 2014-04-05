"use strict";

function TestError(s) {this.__s = s;}
TestError.prototype.toString = function(){return this.__s;};

function runImpl(tests, stat, tab){
    for(var t in tests)
        runTest(t, tests, stat, tab);
}

function runTest(t, tests, stat, tab){
    var r = tests[t];
	if (typeof r != "function"){
        console.log(tab + t);
        runImpl(r, stat, tab + "\t");
        return;
    }

	var padding = "                           ";
	var log = t;
	if (log.length < padding.length)
		log = t + padding.substring(log.length);
	else
		log += " ";

	try {
        ++stat.count;
		r();
		//log += "OK";
	}
	catch (x){
        ++stat.failCount;
		if (x instanceof TestError)
			log += "Failed\n\t" + tab + x;
		else
			log += "Failed\n" + (x.stack ? x.stack : '\t' + tab + x);
        console.log(tab + log);
	}
}

function run(tests){
    var stat = {count: 0, failCount: 0};

    console.log("Running..." );
    var start = (new Date()).getTime();
    if (typeof process != "undefined" && process.argv.length > 2){
        var testName = process.argv[2];
        while (!tests[testName]){
            var dotPos = testName.indexOf(".");
            if (dotPos == -1){
                console.log("test '" + testName + "' not found");
                return;
            }

            var suite = testName.substr(0, dotPos);
            tests = tests[suite];
            if (!tests){
                console.log("suite '" + suite + "' not found");
                return;
            }
            
            testName = testName.substr(dotPos + 1);
        }
        runTest(testName, tests, stat, "");
    }
    else
        runImpl(tests, stat, "");
    var stop = (new Date()).getTime();

    console.log("elapsed: " + (stop - start) / 1000 + " s" );
    console.log(stat.count + " test(s) run");
    if (!stat.failCount)
        console.log("All OK!");
    else
        console.log(stat.failCount + " test(s) failed");
    return !stat.failCount;
}

exports.run = run;
exports.TestError = TestError;