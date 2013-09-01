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
    }
};
var m = function (){
var Base = RTL$.extend({
	init: function Base(){
	}
});
var Derived1 = Base.extend({
	init: function Derived1(){
		Base.prototype.init.call(this);
		this.field1 = 0;
	}
});
var Derived2 = Derived1.extend({
	init: function Derived2(){
		Derived1.prototype.init.call(this);
		this.field2 = 0;
	}
});
var PAnonymousDerived = Base.extend({
	init: function PAnonymousDerived(){
		Base.prototype.init.call(this);
		this.field3 = 0;
	}
});
var pb = null;
var pd1 = null;
var pd2 = null;
var pad = null;

function p(b/*Base*/, d1/*Derived1*/){
	RTL$.typeGuard(b, Derived1).field1 = 0;
	RTL$.typeGuard(b, Derived2).field2 = 1;
	RTL$.typeGuard(d1, Derived2).field2 = 2;
}
pd2 = new Derived2();
pb = pd2;
pd1 = pd2;
RTL$.typeGuard(pb, Derived1).field1 = 0;
RTL$.typeGuard(pb, Derived2).field2 = 1;
RTL$.typeGuard(pd1, Derived2).field2 = 2;
RTL$.typeGuard(pb, Derived1).field1 = 0;
RTL$.typeGuard(pb, Derived2).field2 = 1;
RTL$.typeGuard(pd1, Derived2).field2 = 2;
pad = new PAnonymousDerived();
pb = pad;
RTL$.typeGuard(pb, PAnonymousDerived).field3 = 3;
p(pd2, pd2);
}();
