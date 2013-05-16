var RTL$ = {
    makeSet: function (/*...*/){
        var result = 0;
        
        function checkBit(b){
            if (b < 0 || b > 31)
                throw new Error("integes between 0 and 31 expected, got " + b);
        }

        function setBit(b){
            checkBit(b);
            result |= 1 << b;
        }
        
        for(var i = 0; i < arguments.length; ++i){
            var b = arguments[i];
            if (b instanceof Array){
                var from = b[0];
                var to = b[1];
                if (from < to)
                    throw new Error("invalid SET diapason: " + from + ".." + to);
                for(var bi = from; bi <= to; ++bi)
                    setBit(bi);
            }
            else
                setBit(b);
        }
        return result;
    },
    setInclL: function (l, r){return (l & r) == l;},
    setInclR: function (l, r){return (l & r) == r;}
};
var m = function (){
var ci = 3;
var cs1 = 2 | 4;
var cs2 = 14 & ~18;
var cs3 = 14 & 18;
var cs4 = 14 ^ 18;
var cs5 = ~2;
var s1 = 0;var s2 = 0;
var i1 = 0;
var b = false;

function getSet1(){
	return 2;
}

function getSet2(){
	return 4;
}
s1 = 0;
s1 = 61;
s1 = 8;
s1 = 64;
i1 = 3;
s2 = RTL$.makeSet(i1, i1 + 2, [10 - i1, 15]);
s2 = RTL$.makeSet(i1) | 4;
b = 1 << i1 & s1;
b = RTL$.setInclL(s1, s2);
b = RTL$.setInclR(s1, s2);
b = RTL$.setInclL(getSet1(), getSet2());
b = RTL$.setInclR(getSet1(), getSet2());
b = RTL$.setInclL(cs1, cs2);
b = RTL$.setInclR(cs1, cs2);
b = RTL$.setInclL(cs1 | cs2, cs1 | cs2);
b = RTL$.setInclR(cs1 | cs2, cs2 | cs1);
b = RTL$.setInclL(2 | 4, 2 | 4);
b = RTL$.setInclR(2 | 4, 4 | 2);
b = s1 == s2;
b = s1 != s2;
s1 = s1 | s2;
s1 = s1 & ~s2;
s1 = s1 & s2;
s1 = s1 ^ s2;
s1 = ~s2;
s2 |= 1 << 3;
s1 |= 1 << ci * 2 + 3;
s1 |= 1 << ci * 2 - i1 + 3;
s1 |= 1 << (b ? 1 : 0);
s2 &= ~(1 << 3);
s2 &= ~(1 << (b ? 1 : 0));
}();