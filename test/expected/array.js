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
    }
};
var m = function (){
var arraySize = 10;
var a1 = RTL$.makeArray(10, 0);var a11 = RTL$.makeArray(10, 0);
var a2 = RTL$.makeArray(5, function(){return RTL$.makeArray(10, 0);});
var a3 = RTL$.makeArray(5, false);
var a4 = RTL$.makeArray(3, 4, false);
function anonymous$1(){
}
var a5 = RTL$.makeArray(3, function(){return new anonymous$1();});

function p(){
	var a3 = RTL$.makeArray(1, 0);
	a3[0] = 1;
}

function p1(a/*ARRAY 10 OF INTEGER*/){
}

function p2(a/*VAR ARRAY 10 OF INTEGER*/){
	p1(a);
}

function testAssign(){
	function T(){
	}
	var aInts1 = RTL$.makeArray(3, 0);var aInts2 = RTL$.makeArray(3, 0);
	var aRecords1 = RTL$.makeArray(3, function(){return new T();});var aRecords2 = RTL$.makeArray(3, function(){return new T();});
	var aPointers1 = RTL$.makeArray(3, null);var aPointers2 = RTL$.makeArray(3, null);
	var arrayOfArray1 = RTL$.makeArray(3, 5, false);var arrayOfArray2 = RTL$.makeArray(3, 5, false);
	aInts2 = aInts1.slice();
	aRecords2 = RTL$.clone(aRecords1, {array: {record: {}}});
	aPointers2 = aPointers1.slice();
	arrayOfArray2 = RTL$.clone(arrayOfArray1, {array: {array: null}});
}

function testPassOpenArray(a/*ARRAY OF INTEGER*/){
}
a1[0] = 1;
a3[1] = true;
a4[1][2] = true;
a4[1][2] = true;
p1(a1);
p2(a1);
a1 = a11.slice();
testPassOpenArray(a1);
}();
