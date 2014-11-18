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
    makeRef: function (obj, prop){
        return {set: function(v){ obj[prop] = v; },
                get: function(){ return obj[prop]; }};
    }
};
var m = function (){
function Base1(){
}
RTL$.extend(T1, Base1);
function T1(){
	Base1.call(this);
	this.i = 0;
}
function RecordWithInnerRecord(){
	this.$r = new T1();
}
function RecordWithInnerArray(){
	this.aInts = RTL$.makeArray(3, 0);
	this.$aRecords = RTL$.makeArray(3, function(){return new T1();});
	this.aPointers = RTL$.makeArray(3, null);
}
var b1 = new Base1();
var r1 = new T1();
var recordWithInnerRecord = new RecordWithInnerRecord();
var recordWithInnerArray = new RecordWithInnerArray();

function p1(r/*T1*/){
}

function p2(r/*VAR T1*/){
	p1(r);
}

function byRef(i/*VAR INTEGER*/){
}
RTL$.copyRecord(r1, b1);
p1(r1);
p2(r1);
recordWithInnerRecord.$r.i = 123;
p1(recordWithInnerRecord.$r);
p2(recordWithInnerRecord.$r);
byRef(RTL$.makeRef(recordWithInnerRecord.$r, "i"));
recordWithInnerArray.aInts[0] = 123;
recordWithInnerArray.$aRecords[0].i = 123;
recordWithInnerArray.aPointers[0].i = 123;
}();
