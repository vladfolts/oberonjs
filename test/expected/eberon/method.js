<rtl code>
var m = function (){
function T(){
	this.i = 0;
}
function D(){
	T.call(this);
}
RTL$.extend(D, T);
var dp = null;
T.prototype.p = function(){
	this.i = 123;
};
T.prototype.p2 = function(i/*INTEGER*/){
	return i;
};
T.prototype.methodDefinedWithoutEndingIdent = function(){
};

function acceptPointer(p/*PT*/){
}

function acceptReference(p/*VAR T*/){
}

function acceptConstReferenace(p/*T*/){
}
T.prototype.useSelfAsVar = function(){
	acceptReference(this);
	acceptConstReferenace(this);
};
T.prototype.useSelfAsPointer = function(){
	var pVar = null;
	pVar = this;
	acceptPointer(this);
	acceptReference(this);
	acceptConstReferenace(this);
};
D.prototype.p = function(){
	T.prototype.p.call(this);
};
D.prototype.p2 = function(i/*INTEGER*/){
	return T.prototype.p2.call(this, i);
};
dp = new D();
dp.p();
dp.p();
}();
