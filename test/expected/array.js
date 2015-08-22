<rtl code>
var m = function (){
var arraySize = 10;
var a1 = RTL$.makeArray(10, 0);var a11 = RTL$.makeArray(10, 0);
var a2 = RTL$.makeArray(5, function(){return RTL$.makeArray(10, 0);});
var a3 = RTL$.makeArray(5, false);
var a4 = RTL$.makeArray(3, 4, false);
function anonymous$1(){
}
var a5 = RTL$.makeArray(3, function(){return new anonymous$1();});

function p(){
	var a3 = RTL$.makeArray(1, 0);
	a3[0] = 1;
}

function p1(a/*ARRAY 10 OF INTEGER*/){
}

function p2(a/*VAR ARRAY 10 OF INTEGER*/){
	p1(a);
}

function testAssign(){
	var $scope1 = $scope + ".testAssign";
	function T(){
	}
	var aInts1 = RTL$.makeArray(3, 0);var aInts2 = RTL$.makeArray(3, 0);
	var aRecords1 = RTL$.makeArray(3, function(){return new T();});var aRecords2 = RTL$.makeArray(3, function(){return new T();});
	var aPointers1 = RTL$.makeArray(3, null);var aPointers2 = RTL$.makeArray(3, null);
	var arrayOfArray1 = RTL$.makeArray(3, 5, false);var arrayOfArray2 = RTL$.makeArray(3, 5, false);
	aInts2 = aInts1.slice();
	aRecords2 = RTL$.clone(aRecords1, {array: {record: {}}}, undefined);
	aPointers2 = aPointers1.slice();
	arrayOfArray2 = RTL$.clone(arrayOfArray1, {array: {array: null}}, undefined);
}

function testPassOpenArray(a/*ARRAY OF INTEGER*/){
}
a1[0] = 1;
a3[1] = true;
a4[1][2] = true;
a4[1][2] = true;
p1(a1);
p2(a1);
a1 = a11.slice();
testPassOpenArray(a1);
}();
