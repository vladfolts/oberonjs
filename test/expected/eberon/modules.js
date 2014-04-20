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
var m1 = function (){
var Base = RTL$.extend({
	init: function Base(){
	}
});
Base.prototype.p = function(){
}
return {
	Base: Base
}
}();
var m2 = function (m1){
var T = m1.Base.extend({
	init: function T(){
		m1.Base.prototype.init.call(this);
	}
});
T.prototype.p = function(){
	m1.Base.prototype.p.call(this);
}
}(m1);
