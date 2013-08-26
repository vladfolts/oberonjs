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
var pb = null;
var pd1 = null;
var pd2 = null;
var b = false;
pd2 = new Derived2();
pb = pd2;
pd1 = pd2;
b = pb instanceof Derived1;
b = pb instanceof Derived2;
b = pd1 instanceof Derived2;
}();
