<rtl code>
var m = function (){
function Base(){
}
function Derived1(){
	Base.call(this);
	this.field1 = 0;
}
RTL$.extend(Derived1, Base);
function Derived2(){
	Derived1.call(this);
	this.field2 = 0;
}
RTL$.extend(Derived2, Derived1);
var pb = null;
var pd1 = null;
var pd2 = null;
var b = false;
pd2 = new Derived2();
pb = pd2;
pd1 = pd2;
b = pb instanceof Derived1;
b = pb instanceof Derived1;
b = pb instanceof Derived2;
b = pd1 instanceof Derived2;
b = !(pb instanceof Derived1);
}();
