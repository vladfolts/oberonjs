<rtl code>
var m = function (){
var a1 = [1];
var a2 = [1, 2];
var a3 = [true, false];
var a4 = [1 + 2 | 0, 3];
var a5 = ["a", "bc", "def"];
function T(){
}

function passArray(a/*ARRAY OF INTEGER*/){
}

function inPlace(){
	var a = [1, 2, 3];
	a[1] = 5;
}

function copy(){
	var a = RTL$.makeArray(3, 0);
	var aDyn = [];
	a = [1, 2, 3].slice();
	Array.prototype.splice.apply(aDyn, [0, Number.MAX_VALUE].concat([1, 2, 3, 4, 5]));
}

function return$(){
	return [1, 2, 3];
}

function recordConstructors(){
	var a = [new T()];
	var a2 = [new T(), new T()];
}

function recordVariables(a/*T*/, v/*VAR T*/){
	var r = new T();
	var result = [RTL$.clone(a, {record: {}}, undefined), RTL$.clone(v, {record: {}}, undefined), RTL$.clone(r, {record: {}}, undefined)];
}
passArray(a1);
passArray([1, 2, 3]);
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
