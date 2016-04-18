<rtl code>
var m = function (){
function T(){
	this.p = null;
	this.i = 0;
}
function T2(){
	this.p = null;
}
function Forward(){
}
var p = null;
var r = new T();
var r2 = null;
var pf = null;
function anonymous$1(){
}
var pAnonymous = null;

function passByRef(p/*VAR PT*/){
	p.get().i = 0;
	passByRef(p);
	passByRef(RTL$.makeRef(p.get(), "p"));
}

function derefAndAssign(){
	p = new T();
	RTL$.copy(r, p, {record: {p: null, i: null}});
}
r.p = new T();
r.p.p = new T();
r.p.i = 123;
r2 = new T2();
r2.p = new T();
pf = new Forward();
pAnonymous = new anonymous$1();
passByRef({set: function($v){p = $v;}, get: function(){return p;}});
}();
