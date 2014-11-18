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
var r = new T();
var r2 = null;
var pf = null;
function anonymous$1(){
}
var pAnonymous = null;
r.p = new T();
r.p.p = new T();
r.p.i = 123;
r2 = new T2();
r2.p = new T();
pf = new Forward();
pAnonymous = new anonymous$1();
}();
