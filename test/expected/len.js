<rtl code>
var m = function (){
var s1 = "\"";
var a1 = RTL$.makeArray(10, 0);
var a2 = RTL$.makeArray(15, false);
var a3 = RTL$.makeCharArray(20);
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
