var test = function (){

function integer(b/*BOOLEAN*/, i1/*INTEGER*/, i2/*INTEGER*/){
	return b ? i1 : i2;
}

function integer2(b1/*BOOLEAN*/, b2/*BOOLEAN*/, i1/*INTEGER*/, i2/*INTEGER*/, i3/*INTEGER*/){
	return b1 ? i1 : b2 ? i2 : i3;
}
}();
