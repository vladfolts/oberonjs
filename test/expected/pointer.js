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
var T2 = RTL$.extend({
	init: function T2(){
		this.p = null;
	}
});
var Forward = RTL$.extend({
	init: function Forward(){
	}
});
var r = new T();
var r2 = null;
var pf = null;
var anonymous$1 = RTL$.extend({
	init: function anonymous$1(){
	}
});
var pAnonymous = null;
r.p = new T();
r.p.p = new T();
r.p.i = 123;
r2 = new T2();
r2.p = new T();
pf = new Forward();
pAnonymous = new anonymous$1();
}();
