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

function readIntArray(a/*ARRAY OF INTEGER*/){
	var i = 0;
	i = RTL$.getAt(a, 1);
	i = RTL$.getAt(a, RTL$.getAt(a, i));
}

function writeIntArray(a/*VAR ARRAY OF INTEGER*/){
	var i = 0;
	RTL$.putAt(a, 1, i);
}
}();
