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
var T1 = RTL$.extend({
	init: function T1(){
		this.field1 = 0;
	}
});
var anonymous$1 = RTL$.extend({
	init: function anonymous$1(){
	}
});
var p = null;
var p1 = null;
var anonymous$2 = RTL$.extend({
	init: function anonymous$2(){
		this.p = null;
	}
});
var r = new anonymous$2();
p = new anonymous$1();
p1 = new T1();
r.p = new T1();
}();
