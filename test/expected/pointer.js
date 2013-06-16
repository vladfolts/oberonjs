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
var T = RTL$.extend({
	init: function T(){
		this.p = null;
		this.i = 0;
	}
});
var r = new T();
r.p = new T();
r.p.p = new T();
r.p.i = 123;
}();