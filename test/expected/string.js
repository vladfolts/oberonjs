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
    assignArrayFromString: function (a, s){
        var i;
        for(i = 0; i < s.length; ++i)
            a[i] = s.charCodeAt(i);
        for(i = s.length; i < a.length; ++i)
            a[i] = 0;
    },
    strToArray: function (s){
        var result = new Array(s.length);
        for(var i = 0; i < s.length; ++i)
            result[i] = s.charCodeAt(i);
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
var s2 = "ABC";
var s3 = "with space";
var ch1 = 0;
var a2 = RTL$.makeArray(3, 0);

function p1(s/*ARRAY OF CHAR*/){
}

function p2(c/*CHAR*/){
}
ch1 = 34;
RTL$.assignArrayFromString(a2, s1);
RTL$.assignArrayFromString(a2, s2);
p1(RTL$.strToArray(s1));
p1(RTL$.strToArray(s2));
p2(34);
RTL$.assert(ch1 == 34);
RTL$.assert(34 == ch1);
}();
