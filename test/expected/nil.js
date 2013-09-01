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
var anonymous$1 = RTL$.extend({
	init: function anonymous$1(){
	}
});
var p = null;
p = null;
}();
