var RTL$ = {
    extend: function extend(methods){
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
    },
    makeArray: function (/*dimensions, initializer*/){
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
    clone: function (from){
        var to;
        var len;
        var i;
        var Ctr = from.constructor;
        if (Ctr == Uint16Array){
            len = from.length;
            to = this.__makeCharArray(len);
            for(i = 0; i < len; ++i)
                to[i] = from[i];
        }
        else {
            to = new Ctr();
            if (Ctr == Array)
                len = from.length;
                if (len){
                    if (typeof from[0] != "object")
                        for(i = 0; i < len; ++i)
                            to[i] = from[i];
                    else
                        for(i = 0; i < len; ++i){
                            var o = from[i];
                            if (o !== null)
                                to[i] = this.clone(o);
                        }
                }
            else
                this.copy(from, to);
        }
        return to;
    },
    copy: function (from, to){
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
    __makeCharArray: function (length){
        var result = new Uint16Array(length);
        result.charCodeAt = function(i){return this[i];};
        return result;
    }
};
var m = function (){
var T = RTL$.extend({
	init: function T(){
	}
});
var r = new T();
var i = 0;
var a = RTL$.makeArray(10, 0);

function p(){
	return false;
}

function void$(){
}

function valueArgs(r/*T*/, i/*INTEGER*/, a/*ARRAY 10 OF INTEGER*/){
	var v1 = RTL$.clone(r);
	var v2 = i;
	var v3 = RTL$.clone(a);
}

function varArgs(r/*VAR T*/, i/*VAR INTEGER*/, a/*ARRAY 10 OF INTEGER*/){
	var v1 = RTL$.clone(r);
	var v2 = i.get();
	var v3 = RTL$.clone(a);
}
var v1 = 0;
var v2 = 1.23;
var v3 = "abc";
var v4 = true;
var v5 = i;
var v6 = i + i | 0;
var v7 = p();
var v8 = void$;
var do$ = 0;
var tempRecord = RTL$.clone(r);
var tempArray = RTL$.clone(a);
}();
