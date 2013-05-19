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
var ch = 0;
var i = 0;
var b = false;
var r = 0;
var s = 0;
var a = RTL$.makeArray(10, 0);
i = 65;
ch = i;
i = (ch + i) / 2 | 0;
RTL$.assert(i == 65);
a[(i - 64) * 3] = i;
i = i + (i - 1);
i = i - i + 1;
i = i * i + 1;
i = i * (i + 1);
i = (i / 2 | 0) + 1;
i = i / (2 + 1) | 0;
r = r / 2 + 1;
r = r / (2 + 1);
i = i % 2 + 1;
i = i % (2 + 1);
b = b && b || b;
b = b && (b || b);
b = b && b || b;
b = b || b && b;
b = b == b || b;
b = b == (b || b);
b = b != b || b;
b = b != (b || b);
s = (s | s) & ~s;
s = s | s & ~s;
s = s & s ^ s;
s = s & (s ^ s);
s = s & s | s;
s = s & (s | s);
i = -(i * 2) + i;
i = -(i * (2 + i));
i = -(i % (2 * i));
i = -i + 2 * i;
s = ~s & ~~s;
}();