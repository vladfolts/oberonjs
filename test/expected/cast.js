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
function PAnonymousDerived(){
	Base.call(this);
	this.field3 = 0;
}
RTL$.extend(PAnonymousDerived, Base);
var pb = null;
var pd1 = null;
var pd2 = null;
var pad = null;

function p(b/*VAR Base*/, d1/*VAR Derived1*/){
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
