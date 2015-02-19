var RTL$ = {
    extend: function (cons, base){
        function Type(){}
        Type.prototype = base.prototype;
        cons.prototype = new Type();
        cons.prototype.constructor = cons;
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
    clone: function (from, type){
        var result;
        var r = type.record;
        if (r){
            var Ctr = from.constructor;
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
    makeRef: function (obj, prop){
        return {set: function(v){ obj[prop] = v; },
                get: function(){ return obj[prop]; }};
    },
    assert: function (condition){
        if (!condition)
            throw new Error("assertion failed");
    }
};
var m = function (){
function Base1(){
}
function T1(){
	Base1.call(this);
	this.i = 0;
}
RTL$.extend(T1, Base1);
function RecordWithInnerRecord(){
	this.r = new T1();
}
function RecordWithInnerArray(){
	this.aInts = RTL$.makeArray(3, 0);
	this.aRecords = RTL$.makeArray(3, function(){return new T1();});
	this.aPointers = RTL$.makeArray(3, null);
}
function RecordWithMangledFields(){
	this.constructor$ = 0;
	this.prototype$ = false;
}
var b1 = new Base1();
var r1 = new T1();var r2 = new T1();
var recordWithInnerRecord = new RecordWithInnerRecord();
var recordWithInnerArray = new RecordWithInnerArray();
var recordWithMangledFields = new RecordWithMangledFields();

function p1(r/*T1*/){
}

function p2(r/*VAR T1*/){
	p1(r);
}

function byRef(i/*VAR INTEGER*/){
}
RTL$.copy(r1, b1, {record: {}});
RTL$.copy(r2, r1, {record: {i: null}});
RTL$.copy(recordWithInnerArray, recordWithInnerArray, {record: {aInts: {array: null}, aRecords: {array: {record: {i: null}}}, aPointers: {array: null}}});
p1(r1);
p2(r1);
recordWithInnerRecord.r.i = 123;
p1(recordWithInnerRecord.r);
p2(recordWithInnerRecord.r);
byRef(RTL$.makeRef(recordWithInnerRecord.r, "i"));
recordWithInnerArray.aInts[0] = 123;
recordWithInnerArray.aRecords[0].i = 123;
recordWithInnerArray.aPointers[0].i = 123;
RTL$.assert(recordWithMangledFields.constructor$ == 0);
RTL$.assert(!recordWithMangledFields.prototype$);
}();
