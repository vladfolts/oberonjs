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
        if (!(from instanceof to))
            throw new Error("typeguard assertion failed");
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
var i = 0;
var anonymous$1 = RTL$.extend({
	init: function anonymous$1(){
		this.i = 0;
	}
});
var pr = null;

function p(){
}
pr = new anonymous$1();
return {
	ci: ci,
	Base: Base,
	T: T,
	TP: TP,
	TPA: TPA,
	i: function(){return i;},
	pr: function(){return pr;},
	p: p
}
}();
var m2 = function (m1){
var r = new m1.T();
var pb = null;
var ptr = null;
var ptrA = null;

function p(i/*INTEGER*/){
}

function ref(i/*VAR INTEGER*/){
}
ptr = new m1.T();
pb = ptr;
RTL$.typeGuard(pb, m1.T).i = 123;
ptrA = new m1.TPA();
m1.p();
p(m1.i());
p(m1.ci);
ref(RTL$.makeRef(m1.pr(), "i"));
}(m1);
var m3 = function (m1, m2){
var r = new m2.T();
var a = RTL$.makeArray(3, function(){return new m2.Base();});
var ptr = null;
var pb = null;
ptr = new m2.T();
pb = ptr;
RTL$.typeGuard(pb, m2.T).i = 123;
m2.p();
}(m2, m1);
