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
}();
