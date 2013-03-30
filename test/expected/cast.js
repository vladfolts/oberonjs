var RTL$ = {
	extend: function extend(methods){
		methods.__proto__ = this.prototype; // make instanceof work

		// to see constructor name in diagnostic
		var result = methods.init;
		methods.constructor = result.prototype.constructor;

		result.prototype = methods;
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
		Base.prototype.init.bind(this)();
		this.field1 = 0;
	}
});
var Derived2 = Derived1.extend({
	init: function Derived2(){
		Derived1.prototype.init.bind(this)();
		this.field2 = 0;
	}
});
var pb = null;
var pd1 = null;
var pd2 = null;
pd2 = new Derived2();
pb = pd2;
pd1 = pd2;
RTL$.typeGuard(pb, Derived1).field1 = 0;
RTL$.typeGuard(pb, Derived2).field2 = 1;
RTL$.typeGuard(pd1, Derived2).field2 = 2;
}();