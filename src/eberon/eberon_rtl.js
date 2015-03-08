"use strict";

var oberon_rtl = require("rtl.js");

function extendMap(base, ext){
    var result = {};
    oberon_rtl.applyMap(base, result);
    oberon_rtl.applyMap(ext, result);
    return result;
}

var methods = extendMap(oberon_rtl.rtl.methods, {
    getMappedValue: function(map, key){
        if (!map.hasOwnProperty(key))
            throw new Error("invalid key: " + key);
        return map[key];
    },
    clearMap: function(map){
        for(var p in map)
            delete map[p];
    },
    cloneMapOfScalars: function(map){ // support old code
        return this.clone(map, {map: null});
    },
    clone: function(from, type, recordCons){
        var m = type.map;
        if (m !== undefined){
            var result = {};
            this.__copyMap(from, result, m);
            return result;
        }
        return this.__inheritedClone(from, type, recordCons);
    },
    copy: function(from, to, type){
        var m = type.map;
        if (m !== undefined){
            this.clearMap(to);
            this.__copyMap(from, to, m);
        }
        else
            this.__inheritedCopy(from, to, type);
    },
    __copyMap: function(from, to, type){
        var k;
        if (type === null)
            // shallow copy
            for(k in from)
                to[k] = from[k];
        else
            // deep copy
            for(k in from)
                to[k] = this.clone(from[k], type);
    },
    __inheritedClone: oberon_rtl.rtl.methods.clone,
    __inheritedCopy: oberon_rtl.rtl.methods.copy
});
oberon_rtl.applyMap(methods, exports);

var dependencies = extendMap(oberon_rtl.rtl.dependencies, { 
        "clone": oberon_rtl.rtl.dependencies.clone.concat(["__copyMap", "__inheritedClone"]),
        "copy": oberon_rtl.rtl.dependencies.copy.concat(["clearMap", "__copyMap", "__inheritedCopy"])
    });

exports.rtl = {
    dependencies: dependencies,
    methods: methods,
    nodejsModule: "eberon/eberon_rtl.js"
};
