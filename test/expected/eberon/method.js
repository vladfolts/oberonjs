var RTL$ = {
    extend: function (cons, base){
        function Type(){}
        Type.prototype = base.prototype;
        cons.prototype = new Type();
        cons.prototype.constructor = cons;
    }
};
var m = function (){
function T(){
	this.i = 0;
}
RTL$.extend(D, T);
function D(){
	T.call(this);
}
var dp = null;
T.prototype.p = function(){
	this.i = 123;
}
T.prototype.p2 = function(i/*INTEGER*/){
	return i;
}

function acceptPointer(p/*PT*/){
}

function acceptReferenace(p/*VAR T*/){
}

function acceptConstReferenace(p/*T*/){
}
T.prototype.useSelfAsPointer = function(){
	var pVar = null;
	pVar = this;
	acceptPointer(this);
	acceptReferenace(this);
	acceptConstReferenace(this);
}
D.prototype.p = function(){
	T.prototype.p.call(this);
}
D.prototype.p2 = function(i/*INTEGER*/){
	return T.prototype.p2.call(this, i);
}
dp = new D();
dp.p();
dp.p();
}();
