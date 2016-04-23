*checkIndexes* option generates additional code to check ARRAY or STRING indexes at run-time.

Example:

    var language = require("oberon/oberon_grammar.js").language;
    var options = {checkIndexes: true};
    result = require("oc.js").compile(
            source_code, 
            language, 
            errors_handler,
            options
            );
