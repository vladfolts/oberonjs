var RTL$ = {
    extend: function (cons, base){
        function Type(){}
        Type.prototype = base.prototype;
        cons.prototype = new Type();
        cons.prototype.constructor = cons;
    },
    typeGuard: function (from, to){
        if (!from)
            return from;
        if (!(from instanceof to)){
            var fromStr;
            var toStr;
            
            if (from && from.constructor && from.constructor.name)
                fromStr = "" + from.constructor.name;
            else
                fromStr = "" + from;
            
            if (to.name)
                toStr = "" + to.name;
            else
                toStr = "" + to;
            
            var msg = "typeguard assertion failed";
            if (fromStr || toStr)               
                msg += ": '" + fromStr + "' is not an extension of '" + toStr + "'";
            throw new Error(msg);
        }
        return from;
    }
};
var m = function (){
function Base(){
}
RTL$.extend(Derived1, Base);
function Derived1(){
	Base.call(this);
	this.field1 = 0;
}
RTL$.extend(Derived2, Derived1);
function Derived2(){
	Derived1.call(this);
	this.field2 = 0;
}
RTL$.extend(PAnonymousDerived, Base);
function PAnonymousDerived(){
	Base.call(this);
	this.field3 = 0;
}
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
