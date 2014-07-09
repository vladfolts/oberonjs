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
    assert: function (condition){
        if (!condition)
            throw new Error("assertion failed");
    }
};
var m = function (){
var Message = RTL$.extend({
	init: function Message(){
	}
});
var Derived1 = Message.extend({
	init: function Derived1(){
		Message.prototype.init.call(this);
		this.derivedField1 = false;
	}
});
var Derived2 = Message.extend({
	init: function Derived2(){
		Message.prototype.init.call(this);
		this.derivedField2 = false;
	}
});
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
