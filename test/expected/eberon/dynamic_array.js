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
    },
    assert: function (condition){
        if (!condition)
            throw new Error("assertion failed");
    }
};
var m = function (){
var T = RTL$.extend({
	init: function T(){
		this.a = [];
	}
});
var r = new T();
var a = RTL$.makeArray(3, 0);
var dynamicInt = [];
var dynamicString = [];
var dynamicByte = [];
var dynamicRecord = [];
var dynamicArrayOfStaticArrayInt = [];
var i = 0;
var s = '';
var byte = 0;

function assignDynamicArrayFromStatic(){
	var static$ = RTL$.makeArray(3, 0);
	var dynamic = [];
	dynamic = RTL$.clone(static$);
}
dynamicInt.push(3);
dynamicInt.push(i);
dynamicInt.push(byte);
dynamicString.push("abc");
dynamicString.push("\"");
dynamicString.push(s);
dynamicByte.push(byte);
dynamicByte.push(i & 0xFF);
dynamicRecord.push(RTL$.clone(r));
dynamicArrayOfStaticArrayInt.push(RTL$.clone(a));
RTL$.assert(dynamicInt.indexOf(i) != -1);
dynamicInt.splice(i, 1);
}();
