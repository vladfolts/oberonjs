"use strict";

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

function Class(){}
Class.extend = function extend(methods){
        function Type(){
            for(var m in methods)
                this[m] = methods[m];
        }
        Type.prototype = this.prototype;

        var result = methods.init;
        result.prototype = new Type(); // inherit this.prototype
        result.prototype.constructor = result; // to see constructor name in diagnostic
        
        result.extend = extend;
        return result;
    };

var impl = {
    extend: Class.extend,
    typeGuard: function(from, to){
        if (!(from instanceof to))
            throw new Error("typeguard assertion failed");
        return from;
    },
    makeArray: function(/*dimensions, initializer*/){
        var forward = Array.prototype.slice.call(arguments);
        var result = new Array(forward.shift());
        var i;
        if (forward.length == 1){
            var init = forward[0];
            if (typeof init == "function")
                for(i = 0; i < result.length; ++i)
                    result[i] = init();
            else
                for(i = 0; i < result.length; ++i)
                    result[i] = init;
        }
        else
            for(i = 0; i < result.length; ++i)
                result[i] = this.makeArray.apply(this, forward);
        return result;
    },
    makeSet: function(/*...*/){
        var result = 0;
        
        function checkBit(b){
            if (b < 0 || b > 31)
                throw new Error("integers between 0 and 31 expected, got " + b);
        }

        function setBit(b){
            checkBit(b);
            result |= 1 << b;
        }
        
        for(var i = 0; i < arguments.length; ++i){
            var b = arguments[i];
            if (b instanceof Array){
                var from = b[0];
                var to = b[1];
                if (from < to)
                    throw new Error("invalid SET diapason: " + from + ".." + to);
                for(var bi = from; bi <= to; ++bi)
                    setBit(bi);
            }
            else
                setBit(b);
        }
        return result;
    },
    makeRef: function(obj, prop){
        return {set: function(v){ obj[prop] = v; },
                get: function(){ return obj[prop]; }};
    },
    setInclL: function(l, r){return (l & r) == l;},
    setInclR: function(l, r){return (l & r) == r;},
    assignArrayFromString: function(a, s){
        var i;
        for(i = 0; i < s.length; ++i)
            a[i] = s.charCodeAt(i);
        for(i = s.length; i < a.length; ++i)
            a[i] = 0;
    },
    strToArray: function(s){
        var result = new Array(s.length);
        for(var i = 0; i < s.length; ++i)
            result[i] = s.charCodeAt(i);
        return result;
    },
    copy: function(from, to){
        for(var prop in to){
            if (to.hasOwnProperty(prop)){
                var v = from[prop];
                if (v !== null && typeof v == "object")
                    this.copy(v, to[prop]);
                else
                    to[prop] = v;
            }
        }
    },
    assert: function(condition, code){
        if (!condition)
            throw new Error("assertion failed"
                          + ((code !== undefined) ? " with code " + code : ""));
    }
};

var Code = Class.extend({
    init: function RTL$Code(){
        var names = [];
        for(var f in impl)
            names.push(f);
        this.__functions = names;
    },
    functions: function(){return this.__functions;},
    get: function(func){return impl[func];}
});

var defaultCode = new Code();

exports.Class = Class;
exports.RTL = Class.extend({
    init: function RTL(code){
        this.__entries = {};
        this.__code = code || defaultCode;        
        var names = this.__code.functions();
        for(var i = 0; i < names.length; ++i){
            var name = names[i];
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
            if (!this.__entries[name])
                this.__entries[name] = this.__code.get(name);
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

exports.Code = Code;