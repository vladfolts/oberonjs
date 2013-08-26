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
    copy: function (from, to){
        for(var prop in to){
            if (to.hasOwnProperty(prop)){
                var v = from[prop];
                if (v !== null && typeof v == "object")
                    this.copy(v, to[prop]);
                else
                    to[prop] = v;
            }
        }
    }
};
var m = function (){
var Base1 = RTL$.extend({
	init: function Base1(){
	}
});
var T1 = Base1.extend({
	init: function T1(){
		Base1.prototype.init.call(this);
	}
});
var b1 = new Base1();
var r1 = new T1();

function p1(r/*T1*/){
}

function p2(r/*VAR T1*/){
	p1(r);
}
RTL$.copy(r1, b1);
p1(r1);
p2(r1);
}();
