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
    },
    makeArray: function (/*dimensions, initializer*/){
        var forward = Array.prototype.slice.call(arguments);
        var result = new Array(forward.shift());
        var i;
        if (forward.length == 1){
            var init = forward[0];
            if (typeof init == "function")
                for(i = 0; i < result.length; ++i)
                    result[i] = init();
            else
                for(i = 0; i < result.length; ++i)
                    result[i] = init;
        }
        else
            for(i = 0; i < result.length; ++i)
                result[i] = this.makeArray.apply(this, forward);
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
var T = RTL$.extend({
	init: function T(){
		this.a = [];
	}
});
var a = [];
var r = new T();

function assignDynamicArrayFromStatic(){
	var static$ = RTL$.makeArray(3, 0);
	var dynamic = [];
	var dynamicString = [];
	var dynamicByte = [];
	var i = 0;
	var s = '';
	var byte = 0;
	RTL$.copy(static$, dynamic);
	dynamic.push(3);
	dynamic.push(i);
	dynamic.push(byte);
	dynamicString.push("abc");
	dynamicString.push("\"");
	dynamicString.push(s);
	dynamicByte.push(byte);
	dynamicByte.push(i & 0xFF);
}
}();
