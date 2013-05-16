var RTL$ = {
    extend: function extend(methods){
        methods.__proto__ = this.prototype; // make instanceof work

        // to see constructor name in diagnostic
        var result = methods.init;
        methods.constructor = result.prototype.constructor;

        result.prototype = methods;
        result.extend = extend;
        return result;
    }
};
var m = function (){
var T1 = RTL$.extend({
	init: function T1(){
		this.field1 = 0;
	}
});
var anonymous$1$base = RTL$.extend({
	init: function anonymous$1$base(){
	}
});
var p = null;
var p1 = null;
var anonymous$3 = RTL$.extend({
	init: function anonymous$3(){
		this.p = null;
	}
});
var r = new anonymous$3();
p = new anonymous$1$base();
p1 = new T1();
r.p = new T1();
}();