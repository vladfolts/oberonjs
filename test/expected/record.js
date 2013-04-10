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
RTL$.copy(r1, b1);
}();