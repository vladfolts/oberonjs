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
