var RTL$ = {
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
    copy: function (from, to, type){
        var r = type.record;
        if (r){
            for(var f in r){
                var fieldType = r[f];
                if (fieldType){
                    // temporary support for mangled fields
                    var mangled = "$" + f;
                    if (!from.hasOwnProperty(mangled))
                        mangled = f;
                    this.copy(from[mangled], to[mangled], fieldType);
                }
                else
                    to[f] = from[f];
            }
            return;
        }
        var a = type.array;
        if (a !== undefined ){
            if (a === null)
                // shallow copy
                Array.prototype.splice.apply(to, [0, to.length].concat(from));
            else {
                // deep copy
                to.splice(0, to.length);
                for(var i = 0; i < from.length; ++i)
                    to.push(this.clone(from[i], a));
            }
        }
    },
    clone: function (from, type, recordCons){
        var result;
        var r = type.record;
        if (r){
            var Ctr = recordCons || from.constructor;
            result = new Ctr();
            this.copy(from, result, type);
            return result;
        }
        var a = type.array;
        if (a !== undefined ){
            if (a === null)
                // shallow clone
                return from.slice();

            // deep clone
            var length = from.length;
            result = new Array(length);
            for(var i = 0; i < length; ++i)
                result[i] = this.clone(from[i], a);
            return result;
        }
    },
    assert: function (condition){
        if (!condition)
            throw new Error("assertion failed");
    }
};
var m = function (){
function T(){
	this.a = [];
}
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
	Array.prototype.splice.apply(dynamic, [0, Number.MAX_VALUE].concat(static$));
}

function returnOuterArray(){
	return a.slice();
}

function passArrayBeRef(a/*VAR ARRAY * OF INTEGER*/){
	var static$ = RTL$.makeArray(3, 0);
	a[0] = 1;
	a[0] = a[1];
	Array.prototype.splice.apply(a, [0, Number.MAX_VALUE].concat(static$));
	Array.prototype.splice.apply(a, [0, Number.MAX_VALUE].concat(dynamicInt));
}

function passArrayOfRecordsByRef(a/*VAR ARRAY * OF T*/){
	var result = [];
	RTL$.copy(result, a, {array: {record: {a: {array: null}}}});
}

function passArrayOfArraysByRef(a/*VAR ARRAY *, 3 OF INTEGER*/){
	var result = [];
	RTL$.copy(result, a, {array: {array: null}});
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
dynamicRecord.push(RTL$.clone(r, {record: {a: {array: null}}}, T));
dynamicArrayOfStaticArrayInt.push(a.slice());
RTL$.assert(dynamicInt.indexOf(i) != -1);
RTL$.assert(dynamicChar.indexOf(34) != -1);
dynamicInt.splice(i, 1);
dynamicInt.splice(0, Number.MAX_VALUE);
passArrayBeRef(dynamicInt);
passArrayOfRecordsByRef(dynamicRecord);
passArrayOfArraysByRef(dynamicArrayOfStaticArrayInt);
}();
