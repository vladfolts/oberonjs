var RTL$ = {
    makeCharArray: function (/*dimensions*/){
        var forward = Array.prototype.slice.call(arguments);
        var length = forward.pop();

        if (!forward.length)
            return this.__makeCharArray(length);

        function makeArray(){
            var forward = Array.prototype.slice.call(arguments);
            var result = new Array(forward.shift());
            var i;
            if (forward.length == 1){
                var init = forward[0];
                for(i = 0; i < result.length; ++i)
                    result[i] = init();
            }
            else
                for(i = 0; i < result.length; ++i)
                    result[i] = makeArray.apply(undefined, forward);
            return result;
        }

        forward.push(this.__makeCharArray.bind(this, length));
        return makeArray.apply(undefined, forward);
    },
    __makeCharArray: function (length){
        var result = new Uint16Array(length);
        this.__setupCharArrayMethods(result);
        return result;
    },
    __setupCharArrayMethods: function (a){
        var rtl = this;
        a.charCodeAt = function(i){return this[i];};
        a.slice = function(){
            var result = Array.prototype.slice.apply(this, arguments);
            rtl.__setupCharArrayMethods(result);
            return result;
        };
        a.toString = function(){
            return String.fromCharCode.apply(this, this);
        };
    },
    assignArrayFromString: function (a, s){
        var i;
        for(i = 0; i < s.length; ++i)
            a[i] = s.charCodeAt(i);
        for(i = s.length; i < a.length; ++i)
            a[i] = 0;
    },
    assert: function (condition){
        if (!condition)
            throw new Error("assertion failed");
    },
    strCmp: function (s1, s2){
        var cmp = 0;
        var i = 0;
        while (!cmp && i < s1.length && i < s2.length){
            cmp = s1.charCodeAt(i) - s2.charCodeAt(i);
            ++i;
        }
        return cmp ? cmp : s1.length - s2.length;
    }
};
var m = function (){
var s1 = "\"";
var s2 = "ABC";
var s3 = "with space";
var s4 = "\n";
var s5 = "\r";
var s6 = "\b";
var s7 = "\t";
var s8 = "\f";
var s9 = "\\";
var ch1 = 0;
var a1 = RTL$.makeCharArray(15);
var a2 = RTL$.makeCharArray(3);
var i = 0;

function p1(s/*ARRAY OF CHAR*/){
}

function p2(c/*CHAR*/){
}

function charByRef(c/*VAR CHAR*/){
	c.set(97);
}
ch1 = 34;
RTL$.assignArrayFromString(a1, s1);
RTL$.assignArrayFromString(a2, s2);
RTL$.assignArrayFromString(a1, s2);
p1(s1);
p1(s2);
p2(34);
p2(a1.charCodeAt(0));
RTL$.assert(ch1 == 34);
RTL$.assert(34 == ch1);
RTL$.assert(RTL$.strCmp("abc", "abc") == 0);
RTL$.assert(RTL$.strCmp(a1, a2) == 0);
RTL$.assert(RTL$.strCmp(a1, a2) != 0);
RTL$.assert(RTL$.strCmp(a1, a2) > 0);
RTL$.assert(RTL$.strCmp(a1, s1) > 0);
RTL$.assert(RTL$.strCmp(a1, s1) >= 0);
RTL$.assert(RTL$.strCmp(a1, s1) != 0);
RTL$.assert(RTL$.strCmp(s1, a1) < 0);
RTL$.assert(RTL$.strCmp(s1, a1) <= 0);
RTL$.assert(RTL$.strCmp(s1, a1) != 0);
a1[0] = 97;
a1[1] = a1.charCodeAt(0);
RTL$.assert(s1.charCodeAt(0) == 34);
RTL$.assert(s2.charCodeAt(0) == 65);
p2(s2.charCodeAt(0));
p2(s2.charCodeAt(i));
}();
