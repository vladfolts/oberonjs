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
    assert: function (condition){
        if (!condition)
            throw new Error("assertion failed");
    }
};
var m = function (){
function Base(){
}
function Derived(){
	Base.call(this);
	this.derivedField = 0;
}
RTL$.extend(Derived, Base);
var r = new Derived();
var pbVar = null;
var pdVar = null;
var i = 0;
var a = RTL$.makeArray(10, 0);

function p(){
	return false;
}

function void$(){
}

function valueArgs(r/*Derived*/, i/*INTEGER*/, a/*ARRAY 10 OF INTEGER*/){
	var v1 = RTL$.clone(r, {record: {derivedField: null}});
	var v2 = i;
	var v3 = a.slice();
}

function varArgs(r/*VAR Derived*/, i/*VAR INTEGER*/, a/*ARRAY 10 OF INTEGER*/){
	var v1 = RTL$.clone(r, {record: {derivedField: null}});
	var v2 = i.get();
	var v3 = a.slice();
}

function pChar(c/*CHAR*/){
}

function pCharArray(a/*ARRAY OF CHAR*/){
}

function pString(s/*STRING*/){
}
var v1 = 0;
var v2 = 1.23;
var v3 = "abc";
var vs = "\"";
pChar(vs.charCodeAt(0));
pChar(34);
pCharArray(vs);
pString(vs);
var v4 = true;
var v5 = i;
var v6 = i + i | 0;
var v7 = p();
var v8 = void$;
var do$ = 0;
var tempRecord = RTL$.clone(r, {record: {derivedField: null}});
var tempArray = a.slice();
pdVar = new Derived();
pbVar = pdVar;
var pb = pbVar;
if (pb instanceof Derived){
	pb.derivedField = 123;
}
RTL$.assert(!(pb instanceof Derived) || pb.derivedField == 123);
for (var j = 0; j <= 10; ++j){
}
}();
