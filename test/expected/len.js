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
                result[i] = this.makeArray.apply(this, forward);
        return result;
    },
    assert: function (condition, code){
        if (!condition)
            throw new Error("assertion failed"
                          + ((code !== undefined) ? " with code " + code : ""));
    }
};
var m = function (){
var s1 = "\"";
var a1 = RTL$.makeArray(10, 0);
var a2 = RTL$.makeArray(15, false);
var a3 = RTL$.makeArray(20, 0);
var i = 0;

function p1(a/*ARRAY OF INTEGER*/){
	return a.length;
}

function p2(a/*VAR ARRAY OF BOOLEAN*/){
	return a.length;
}
i = p1(a1);
i = p2(a2);
RTL$.assert(a3.length == 20);
RTL$.assert(s1.length == 1);
RTL$.assert("abc".length == 3);
}();