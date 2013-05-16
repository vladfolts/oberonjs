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
var anonymous$1$base = RTL$.extend({
	init: function anonymous$1$base(){
	}
});
var p = null;
p = null;
}();