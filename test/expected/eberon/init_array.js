<rtl code>
var m = function (){
var a1 = [1];
var a2 = [1, 2];
var a3 = [true, false];
var a4 = [1 + 2 | 0, 3];
var a5 = ["a", "bc", "def"];

function passArray(a/*ARRAY OF INTEGER*/){
}
passArray(a1);
for (var i = 0; i <= a1.length; ++i){
	RTL$.assert(a1[i] != 0);
}
var $seq1 = a1;
for(var $key2 = 0; $key2 < $seq1.length; ++$key2){
	var e = $seq1[$key2];
	RTL$.assert(e != 0);
}
RTL$.assert(a5.indexOf("a") == 0);
}();
