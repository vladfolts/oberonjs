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
    cloneRecord: function (from){
        var Ctr = from.constructor;
        var result = new Ctr();
        this.copyRecord(from, result);
        return result;
    },
    copyRecord: function (from, to){
        for(var prop in to){
            if (to.hasOwnProperty(prop)){
                var v = from[prop];
                var isScalar = prop[0] != "$";
                if (isScalar)
                    to[prop] = v;
                else
                    to[prop] = v instanceof Array ? this.cloneArrayOfRecords(v)
                                                  : this.cloneRecord(v);
            }
        }
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
var dynamicChar = [];
var dynamicByte = [];
var dynamicRecord = [];
var dynamicArrayOfStaticArrayInt = [];
var i = 0;
var s = '';
var byte = 0;

function assignDynamicArrayFromStatic(){
	var static$ = RTL$.makeArray(3, 0);
	var dynamic = [];
	dynamic = static$.slice();
}

function returnOuterArray(){
	return a.slice();
}
dynamicInt.push(3);
dynamicInt.push(i);
dynamicInt.push(byte);
dynamicString.push("abc");
dynamicString.push("\"");
dynamicString.push(s);
dynamicChar.push(34);
dynamicByte.push(byte);
dynamicByte.push(i & 0xFF);
dynamicRecord.push(RTL$.cloneRecord(r));
dynamicArrayOfStaticArrayInt.push(a.slice());
RTL$.assert(dynamicInt.indexOf(i) != -1);
RTL$.assert(dynamicChar.indexOf(34) != -1);
dynamicInt.splice(i, 1);
dynamicInt.splice(0, Number.MAX_VALUE);
}();
