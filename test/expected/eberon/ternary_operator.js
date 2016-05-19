<rtl code>
var test = function (){

function integer(b/*BOOLEAN*/, i1/*INTEGER*/, i2/*INTEGER*/){
	return b ? i1 : i2;
}

function integer2(b1/*BOOLEAN*/, b2/*BOOLEAN*/, i1/*INTEGER*/, i2/*INTEGER*/, i3/*INTEGER*/){
	return b1 ? i1 : b2 ? i2 : i3;
}

function byRef(b/*BOOLEAN*/, i1/*VAR INTEGER*/, i2/*VAR INTEGER*/){
	return b ? i1.get() : i2.get();
}

function byRef1(b/*BOOLEAN*/, i1/*VAR INTEGER*/, i2/*INTEGER*/){
	return b ? i1.get() : i2;
}

function byRef2(b/*BOOLEAN*/, i1/*INTEGER*/, i2/*VAR INTEGER*/){
	return b ? i1 : i2.get();
}

function passRecord(b/*BOOLEAN*/){
	var $scope1 = $scope + ".passRecord";
	function T(){
	}
	var r1 = new T();var r2 = new T();
	
	function p(r/*T*/){
	}
	p(b ? r1 : r2);
}

function initRecord(b/*BOOLEAN*/){
	var $scope1 = $scope + ".initRecord";
	function T(){
	}
	var r1 = new T();var r2 = new T();
	var r = RTL$.clone(b ? r1 : r2, {record: {}}, undefined);
}

function initRecordFromConstructor(b/*BOOLEAN*/){
	var $scope1 = $scope + ".initRecordFromConstructor";
	function T(i/*INTEGER*/){
	}
	var r = b ? new T(1) : new T(2);
}

function initRecordFromConstructorOrVariable(b/*BOOLEAN*/){
	var $scope1 = $scope + ".initRecordFromConstructorOrVariable";
	function T(){
	}
	var r = new T();
	var r1 = b ? RTL$.clone(r, {record: {}}, undefined) : new T();
	var r2 = b ? new T() : RTL$.clone(r, {record: {}}, undefined);
}

function operatorsPriority(b/*BOOLEAN*/){
	return (b ? 1 : 2) + 3 | 0;
}
}();
