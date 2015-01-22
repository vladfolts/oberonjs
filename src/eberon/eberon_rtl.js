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
    }
};
oberon_rtl.copyMap(oberon_rtl.rtl.methods, methods);
oberon_rtl.copyMap(methods, exports);

exports.rtl = {
    dependencies: oberon_rtl.rtl.dependencies,
    methods: methods,
    nodejsModule: "eberon/eberon_rtl.js"
};
