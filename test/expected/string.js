<rtl code>
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
