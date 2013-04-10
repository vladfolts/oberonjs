var RTL$ = {
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
                result[i] = RTLMakeArray.apply(this, forward);
        return result;
    },
	extend: function extend(methods){
        methods.__proto__ = this.prototype; // make instanceof work

        // to see constructor name in diagnostic
        var result = methods.init;
        methods.constructor = result.prototype.constructor;

        result.prototype = methods;
        result.extend = extend;
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
var arraySize = 10;
var a1 = RTL$.makeArray(10, 0);var a11 = RTL$.makeArray(10, 0);
var a2 = RTL$.makeArray(5, function(){return RTL$.makeArray(10, 0);});
var a3 = RTL$.makeArray(5, false);
var a4 = RTL$.makeArray(3, 4, false);
var anonymous$1 = RTL$.extend({
	init: function anonymous$1(){
	}
});
var a5 = RTL$.makeArray(3, function(){return new anonymous$1();});

function p(){
	var a3 = RTL$.makeArray(1, 0);
	a3[0] = 1;
}
a1[0] = 1;
a3[1] = true;
a4[1][2] = true;
a4[1][2] = true;
RTL$.copy(a11, a1);
}();