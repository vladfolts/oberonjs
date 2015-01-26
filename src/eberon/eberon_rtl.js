"use strict";

var oberon_rtl = require("rtl.js");

var methods = {
    getMappedValue: function(map, key){
        if (!map.hasOwnProperty(key))
            throw new Error("invalid key: " + key);
        return map[key];
    },
    clearMap: function(map){
        for(var p in map)
            delete map[p];
    },
    cloneMapOfScalars: function(from){
        var result = {};
        this.copyMapOfScalars(from, result);
        return result;
    },
    copyMapOfScalars: function(from, to){
        this.clearMap(to);
        for(var k in from)
            to[k] = from[k];
    }
};
oberon_rtl.extendMap(oberon_rtl.rtl.methods, methods);
oberon_rtl.extendMap(methods, exports);

var dependencies = { 
        "copyMapOfScalars": ["clearMap"],
        "cloneMapOfScalars": ["copyMapOfScalars"]
    };
oberon_rtl.extendMap(oberon_rtl.rtl.dependencies, dependencies);

exports.rtl = {
    dependencies: dependencies,
    methods: methods,
    nodejsModule: "eberon/eberon_rtl.js"
};
