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
    typeGuard: function (from, to){
        if (!(from instanceof to)){
            var fromStr;
            var toStr;
            if (!from)
                fromStr = "" + fromStr;
            else if (from.constructor && from.constructor.name)
                fromStr = "" + from.constructor.name;
            if (!to)
                toStr = "" + to;
            else if (to.constructor && to.constructor.name)
                toStr = "" + to.constructor.name;
            
            var msg = "typeguard assertion failed";
            if (fromStr || toStr)               
                msg += ": '" + fromStr + "' is not an extension of '" + toStr + "'";
            throw new Error(msg);
        }
        return from;
    },
    makeRef: function (obj, prop){
        return {set: function(v){ obj[prop] = v; },
                get: function(){ return obj[prop]; }};
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
    }
};
var m1 = function (){
var ci = 123;
var Base = RTL$.extend({
	init: function Base(){
		this.i = 0;
	}
});
var T = Base.extend({
	init: function T(){
		Base.prototype.init.call(this);
	}
});
var TPA = RTL$.extend({
	init: function TPA(){
	}
});
var TPB = Base.extend({
	init: function TPB(){
		Base.prototype.init.call(this);
	}
});
var i = 0;
var anonymous$1 = RTL$.extend({
	init: function anonymous$1(){
		this.i = 0;
	}
});
var pr = null;
var pr2 = null;

function p(){
}

function makeTPA(){
	var result = null;
	result = new TPA();
	return result;
}

function makeTPB(){
	var result = null;
	result = new TPB();
	return result;
}
pr = new anonymous$1();
return {
	ci: ci,
	Base: Base,
	T: T,
	TPA: TPA,
	TPB: TPB,
	i: function(){return i;},
	pr: function(){return pr;},
	pr2: function(){return pr2;},
	p: p,
	makeTPA: makeTPA,
	makeTPB: makeTPB
}
}();
var m2 = function (m1){
var T = m1.T.extend({
	init: function T(){
		m1.T.prototype.init.call(this);
		this.i2 = 0;
	}
});
var r = new m1.T();
var r2 = new T();
var pb = null;
var ptr = null;
var ptr2 = null;
var ptrA = null;

function p(i/*INTEGER*/){
}

function ref(i/*VAR INTEGER*/){
}
ptr = new m1.T();
pb = ptr;
RTL$.typeGuard(pb, m1.T).i = 123;
ptr2 = new T();
ptr2.i = 1;
ptr2.i2 = 2;
ptrA = m1.makeTPA();
m1.p();
p(m1.i());
p(m1.ci);
ref(RTL$.makeRef(m1.pr2(), "i"));
}(m1);
var m3 = function (m1, m2){
var T = m2.T.extend({
	init: function T(){
		m2.T.prototype.init.call(this);
	}
});
var r = new m2.T();
var r2 = new T();
var a = RTL$.makeArray(3, function(){return new m2.Base();});
var ptr = null;
var pb = null;
var pTPB = null;
ptr = new m2.T();
pb = ptr;
RTL$.typeGuard(pb, m2.T).i = 123;
pb = m2.makeTPB();
pTPB = RTL$.typeGuard(pb, m2.TPB);
m2.p();
}(m2, m1);
