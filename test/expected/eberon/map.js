<rtl code>
var test = function (){
function T(){
}
var m = {};
var mr = {};
var mm = {};
var ma = {};
function anonymous$1(){
	this.m = {};
}
var r = new anonymous$1();
var a = RTL$.makeArray(1, function(){return {};});
function RecordWithMapInitializedInConstructor(m/*MAP OF INTEGER*/){
	this.m = RTL$.clone(m, {map: null}, undefined);
}

function ForEach(){
	var m = {};
	var $seq1 = m;
	for(var k in $seq1){
		var v = $seq1[k];
		RTL$.assert(v == 0);
		RTL$.assert(k != "");
	}
}

function makeMap(){
	var m = {};
	return RTL$.clone(m, {map: null}, undefined);
}

function ForEachWithExpression(){
	var $seq1 = makeMap();
	for(var k in $seq1){
		var v = $seq1[k];
	}
}

function NestedForEach(){
	var m = {};
	
	function inner(){
		var $seq1 = m;
		for(var k in $seq1){
			var v = $seq1[k];
			var $seq2 = m;
			for(var k2 in $seq2){
				var v2 = $seq2[k2];
			}
		}
	}
	var $seq1 = m;
	for(var k in $seq1){
		var v = $seq1[k];
		var $seq2 = m;
		for(var k2 in $seq2){
			var v2 = $seq2[k2];
		}
	}
	var $seq3 = m;
	for(var k3 in $seq3){
		var v3 = $seq3[k3];
		var $seq4 = m;
		for(var k in $seq4){
			var v = $seq4[k];
		}
	}
}

function put(){
	var $scope1 = $scope + ".put";
	function T(){
		this.field = 0;
	}
	function Derived(){
		T.call(this);
	}
	RTL$.extend(Derived, T, $scope1);
	var m = {};
	var s = '';
	var a = RTL$.makeCharArray(3);
	var r = new T();
	var pr = null;
	var d = new Derived();
	var mapOfMap = {};
	var mapOfRecord = {};
	var mapOfPointer = {};
	m["a"] = 1;
	m["abc"] = 2;
	m[s] = 3;
	m[a] = 4;
	RTL$.getMappedValue(mapOfMap, "abc")["cde"] = 5;
	mapOfRecord["abc"] = RTL$.clone(r, {record: {field: null}}, T);
	pr = new T();
	mapOfRecord["abc"] = RTL$.clone(pr, {record: {field: null}}, T);
	mapOfRecord["abc"] = RTL$.clone(d, {record: {field: null}}, T);
	mapOfRecord["abc"] = new T();
	mapOfRecord["abc"] = RTL$.clone(new Derived(), {record: {field: null}}, T);
	RTL$.getMappedValue(mapOfRecord, "abc").field = 6;
	mapOfPointer["abc"] = new T();
	RTL$.copy(new T(), RTL$.getMappedValue(mapOfPointer, "abc"), {record: {field: null}});
	mapOfPointer["abc"] = new Derived();
	RTL$.copy(new Derived(), RTL$.getMappedValue(mapOfPointer, "abc"), {record: {field: null}});
}

function in$(){
	var m = {};
	RTL$.assert(!Object.prototype.hasOwnProperty.call(m, "abc"));
}

function get(){
	var m = {};
	var s = '';
	var a = RTL$.makeCharArray(3);
	RTL$.assert(RTL$.getMappedValue(m, "a") == 1);
	RTL$.assert(RTL$.getMappedValue(m, "abc") == 2);
	RTL$.assert(RTL$.getMappedValue(m, s) == 3);
	RTL$.assert(RTL$.getMappedValue(m, a) == 4);
}

function remove(){
	var m = {};
	delete m["abc"];
}

function clear(){
	var m = {};
	RTL$.clearMap(m);
	RTL$.clearMap(m);
}

function returnLocalMap(){
	var result = {};
	return RTL$.clone(result, {map: null}, undefined);
}

function returnNonLocalMap(m/*MAP OF INTEGER*/){
	return RTL$.clone(m, {map: null}, undefined);
}

function assign(a/*MAP OF INTEGER*/){
	var v = {};
	RTL$.copy(a, v, {map: null});
	var v2 = RTL$.clone(a, {map: null}, undefined);
	var v3 = RTL$.clone(v2, {map: null}, undefined);
	var v4 = RTL$.clone(returnLocalMap(), {map: null}, undefined);
	var v5 = RTL$.clone(returnNonLocalMap(v), {map: null}, undefined);
}

function copyMapOfRecord(){
	var $scope1 = $scope + ".copyMapOfRecord";
	function T(){
	}
	var r1 = {};var r2 = {};
	RTL$.copy(r2, r1, {map: {record: {}}});
}

function cloneMapOfRecord(){
	var $scope1 = $scope + ".cloneMapOfRecord";
	function T(){
	}
	var r1 = {};
	var r2 = RTL$.clone(r1, {map: {record: {}}}, undefined);
}

function passByRef(m/*VAR MAP OF INTEGER*/){
	m["abc"] = 123;
	RTL$.assert(Object.prototype.hasOwnProperty.call(m, "abc"));
}

function passMapRecordElementByRef(r/*VAR T*/){
}

function passMapMapElementByRef(m/*VAR MAP OF INTEGER*/){
}

function passMapArrayElementByRef(a/*VAR ARRAY * OF INTEGER*/){
}
var $seq1 = m;
for(var k in $seq1){
	var v = $seq1[k];
	var $seq2 = m;
	for(var k2 in $seq2){
		var v2 = $seq2[k2];
	}
}
passByRef(m);
passByRef(r.m);
passByRef(a[0]);
passMapRecordElementByRef(RTL$.getMappedValue(mr, "a"));
passMapMapElementByRef(RTL$.getMappedValue(mm, "a"));
passMapArrayElementByRef(RTL$.getMappedValue(ma, "a"));
}();
