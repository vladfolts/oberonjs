var RTL$ = {
    assert: function (condition){
        if (!condition)
            throw new Error("assertion failed");
    }
};
var m = function (){
var cs1 = "abc" + "cde";
var cs2 = "\"" + "\"";
var s = '';var s1 = '';var s2 = '';
var b = false;
var i = 0;

function p1(a/*ARRAY OF CHAR*/){
}

function pChar(c/*CHAR*/){
}

function pString(s/*STRING*/){
	s = "\"";
}

function pStringByRef(s/*VAR STRING*/){
}
s = s1 + s2;
b = s1 == s2;
b = s1 != s2;
b = s1 < s2;
b = s1 > s2;
b = s1 <= s2;
b = s1 >= s2;
p1(s);
RTL$.assert(s.length == 0);
pChar(s1.charCodeAt(i));
pString(s1);
pString("abc");
pStringByRef({set: function($v){s1 = $v;}, get: function(){return s1;}});
}();
