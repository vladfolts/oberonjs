var RTL$ = {
    extend: function (cons, base){
        function Type(){}
        Type.prototype = base.prototype;
        cons.prototype = new Type();
        cons.prototype.constructor = cons;
    },
    assert: function (condition){
        if (!condition)
            throw new Error("assertion failed");
    }
};
var m = function (){
function Message(){
}
function Derived1(){
	Message.call(this);
	this.derivedField1 = false;
}
RTL$.extend(Derived1, Message);
function Derived2(){
	Message.call(this);
	this.derivedField2 = false;
}
RTL$.extend(Derived2, Message);
var d1 = new Derived1();
var d2 = new Derived2();

function handleMessage(msg/*VAR Message*/){
	if (msg instanceof Derived1){
		RTL$.assert(msg.derivedField1);
	}
	else if (msg instanceof Derived2){
		RTL$.assert(msg.derivedField2);
	}
}
handleMessage(d1);
handleMessage(d2);
}();
