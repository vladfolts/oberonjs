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
    cloneArrayOfRecords: function (from){
        var length = from.length;
        var result = new Array(length);
        if (length){
            var method = from[0] instanceof Array 
                       ? this.cloneArrayOfRecords // this is array of arrays, go deeper
                       : this.cloneRecord;
            for(var i = 0; i < result.length; ++i)
                result[i] = method.call(this, from[i]);
        }
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
    cloneArrayOfScalars: function (from){
        var length = from.length;
        if (!length)
            return [];
        if (!(from[0] instanceof Array))
            return from.slice();

        // this is array of arrays, go deeper
        var result = new Array(length);
        for(var i = 0; i < length; ++i)
            result[i] = this.cloneArrayOfScalars(from[i]);
        return result;
    }
};
var m = function (){
var arraySize = 10;
var a1 = RTL$.makeArray(10, 0);var a11 = RTL$.makeArray(10, 0);
var a2 = RTL$.makeArray(5, function(){return RTL$.makeArray(10, 0);});
var a3 = RTL$.makeArray(5, false);
var a4 = RTL$.makeArray(3, 4, false);
var anonymous$1 = RTL$.extend({
	init: function anonymous$1(){
	}
});
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
	var T = RTL$.extend({
		init: function T(){
		}
	});
	var aInts1 = RTL$.makeArray(3, 0);var aInts2 = RTL$.makeArray(3, 0);
	var aRecords1 = RTL$.makeArray(3, function(){return new T();});var aRecords2 = RTL$.makeArray(3, function(){return new T();});
	var aPointers1 = RTL$.makeArray(3, null);var aPointers2 = RTL$.makeArray(3, null);
	var arrayOfArray1 = RTL$.makeArray(3, 5, false);var arrayOfArray2 = RTL$.makeArray(3, 5, false);
	aInts2 = aInts1.slice();
	aRecords2 = RTL$.cloneArrayOfRecords(aRecords1);
	aPointers2 = aPointers1.slice();
	arrayOfArray2 = RTL$.cloneArrayOfScalars(arrayOfArray1);
}
a1[0] = 1;
a3[1] = true;
a4[1][2] = true;
a4[1][2] = true;
p1(a1);
p2(a1);
a1 = a11.slice();
}();
