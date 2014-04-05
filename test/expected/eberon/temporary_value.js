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
	}
});
var r = new T();
var i = 0;

function p(){
	return false;
}

function void$(){
}

function valueArgs(r/*T*/, i/*INTEGER*/){
	var v1 = r;
	var v2 = i;
}

function varArgs(r/*VAR T*/, i/*VAR INTEGER*/){
	var v1 = r;
	var v2 = i;
}
var v1 = 0;
var v2 = 1.23;
var v3 = "abc";
var v4 = true;
var v5 = i;
var v6 = i + i | 0;
var v7 = p();
var v8 = void$;
var do$ = 0;
var tempRecord = r;
}();
