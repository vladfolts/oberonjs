var test = require("test_unit.js");
var result = test.run();
if (typeof process != "undefined")
    process.exit(result ? 0 : -1);