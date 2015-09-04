<rtl code>
var m = function (){
function T(){
	this.a = [];
}
var r = new T();
var a = RTL$.makeArray(3, 0);
var dynamicInt = [];
var dynamicString = [];
var dynamicChar = [];
var dynamicByte = [];
var dynamicRecord = [];
var dynamicArrayOfStaticArrayInt = [];
var i = 0;
var s = '';
var byte = 0;

function assignDynamicArrayFromStatic(){
	var static$ = RTL$.makeArray(3, 0);
	var dynamic = [];
	Array.prototype.splice.apply(dynamic, [0, Number.MAX_VALUE].concat(static$));
}

function returnOuterArray(){
	return a.slice();
}

function passArrayBeRef(a/*VAR ARRAY * OF INTEGER*/){
	var static$ = RTL$.makeArray(3, 0);
	a[0] = 1;
	a[0] = a[1];
	Array.prototype.splice.apply(a, [0, Number.MAX_VALUE].concat(static$));
	Array.prototype.splice.apply(a, [0, Number.MAX_VALUE].concat(dynamicInt));
}

function passArrayOfRecordsByRef(a/*VAR ARRAY * OF T*/){
	var result = [];
	RTL$.copy(result, a, {array: {record: {a: {array: null}}}});
}

function passArrayOfArraysByRef(a/*VAR ARRAY *, 3 OF INTEGER*/){
	var result = [];
	RTL$.copy(result, a, {array: {array: null}});
}

function arrayOfRecords(){
	var $scope1 = $scope + ".arrayOfRecords";
	function T(){
	}
	var a = [];
	a.push(new T());
}

function arrayOfArrays(){
	var aa = [];
	
	function f(){
		var a = [];
		return a;
	}
	aa.push(f());
}

function optimizeTemporartArrayReturn(){
	
	function f(){
		var a = [];
		return a;
	}
	return f();
}

function optimizeLocalArrayReturn(){
	var a = [];
	return a;
}

function optimizeLocalArrayReturnWhenStatic(){
	var a = RTL$.makeArray(3, 0);
	return a;
}

function cannotOptimizeArgArrayReturn(a/*ARRAY OF INTEGER*/){
	return a.slice();
}

function cannotOptimizeVarArgArrayReturn(a/*VAR ARRAY OF INTEGER*/){
	return a.slice();
}

function cannotOptimizeVarArgDynamicArrayReturn(a/*VAR ARRAY * OF INTEGER*/){
	return a.slice();
}

function arrayOfMaps(){
	var aa = [];
	
	function f(){
		var a = {};
		return a;
	}
	aa.push(f());
}
dynamicInt.push(3);
dynamicInt.push(i);
dynamicInt.push(byte);
dynamicString.push("abc");
dynamicString.push("\"");
dynamicString.push(s);
dynamicChar.push(34);
dynamicByte.push(byte);
dynamicByte.push(i & 0xFF);
dynamicRecord.push(RTL$.clone(r, {record: {a: {array: null}}}, T));
dynamicArrayOfStaticArrayInt.push(a.slice());
RTL$.assert(dynamicInt.indexOf(i) != -1);
RTL$.assert(dynamicChar.indexOf(34) != -1);
dynamicInt.splice(i, 1);
dynamicInt.splice(0, Number.MAX_VALUE);
passArrayBeRef(dynamicInt);
passArrayOfRecordsByRef(dynamicRecord);
passArrayOfArraysByRef(dynamicArrayOfStaticArrayInt);
}();
