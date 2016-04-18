<rtl code>
var m = function (){

function readCharArray(a/*ARRAY OF CHAR*/){
	var c = 0;
	c = RTL$.charAt(a, 1);
	c = RTL$.charAt(a, RTL$.charAt(a, 1));
}

function writeCharArray(a/*VAR ARRAY OF CHAR*/){
	var c = 0;
	RTL$.putAt(a, 1, c);
	RTL$.putAt(a, RTL$.charAt(a, 1), c);
}

function writeIntArray(a/*VAR ARRAY OF INTEGER*/){
	var i = 0;
	RTL$.putAt(a, 1, i);
}
}();
