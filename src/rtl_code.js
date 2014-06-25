"use strict";

var Rtl = require("rtl.js");

// support IE8
if (!Array.prototype.indexOf)
    Array.prototype.indexOf = function(x){
        for(var i = 0; i < this.length; ++i)
            if (this[i] === x)
                return i;
        return -1;
    };

// support Function.bind
if (!Function.prototype.bind)
    Function.prototype.bind = function(thisArg){
        var self = this;
        var bindArgs = Array.prototype.slice.call(arguments, 1);
        return function(){
            return self.apply(thisArg, bindArgs.concat(Array.prototype.slice.call(arguments)));
        };
    };

exports.RTL = Rtl.Class.extend({
    init: function RTL(demandedCallback){
        this.__entries = {};
        this.__demandedCallback = demandedCallback;

        for(var name in Rtl){
            this[name] = this.__makeOnDemand(name);
            this[name + "Id"] = this.__makeIdOnDemand(name);
        }
    },
    name: function(){return "RTL$";},
    generate: function(){
        var result = "var " + this.name() + " = {\n";
        var firstEntry = true;
        for (var name in this.__entries){
            if (!firstEntry)
                result += ",\n";
            else
                firstEntry = false;
            result += "    " + name + ": " + this.__entries[name].toString();
        }
        if (!firstEntry)
            result += "\n};\n";
        else
            result = undefined;
        
        return result;
    },
    __makeIdOnDemand: function(name){
        return function(){
            if (this.__demandedCallback)
                this.__demandedCallback();
            if (!this.__entries[name])
                this.__entries[name] = Rtl[name];
            
            var dependencies = Rtl.dependencies[name];
            if (dependencies)
                for(var i = 0; i < dependencies.length; ++i){
                    var d = dependencies[i];
                    if (!this.__entries[d])
                        this.__entries[d] = Rtl[d];
                }

            return this.name() + "." + name;
        };
    },
    __makeOnDemand: function(name){
        return function(){
            var result = this[name +"Id"]() + "(";
            if (arguments.length){
                result += arguments[0];
                for(var a = 1; a < arguments.length; ++a)
                    result += ", " + arguments[a];
            }
            result += ")";
            return result;
        };
    }

});
