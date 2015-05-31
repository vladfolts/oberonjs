<rtl code>
var m1 = function (){
var ci = 123;
function Base(){
	this.i = 0;
}
function T(){
	Base.call(this);
}
RTL$.extend(T, Base);
function TPA(){
}
function TPB(){
	Base.call(this);
}
RTL$.extend(TPB, Base);
function ExportPointerOnly(){
	Base.call(this);
}
RTL$.extend(ExportPointerOnly, Base);
var i = 0;
function anonymous$1(){
	this.i = 0;
}
var pr = null;
var pr2 = null;

function p(){
}

function makeTPA(){
	var result = null;
	result = new TPA();
	return result;
}

function makeTPB(){
	var result = null;
	result = new TPB();
	return result;
}

function constructor(){
}

function prototype(){
}
pr = new anonymous$1();
return {
	ci: ci,
	Base: Base,
	T: T,
	TPA: TPA,
	TPB: TPB,
	ExportPointerOnly: ExportPointerOnly,
	i: function(){return i;},
	pr: function(){return pr;},
	pr2: function(){return pr2;},
	p: p,
	makeTPA: makeTPA,
	makeTPB: makeTPB,
	constructor$: constructor,
	prototype$: prototype
}
}();
var m2 = function (m1){
function T(){
	m1.T.call(this);
	this.i2 = 0;
}
RTL$.extend(T, m1.T);
var r = new m1.T();
var r2 = new T();
var pb = null;
var ptr = null;
var ptr2 = null;
var ptrA = null;

function p(i/*INTEGER*/){
}

function ref(i/*VAR INTEGER*/){
}

function castToImportedPointer(p/*PBase*/){
	var p2 = null;
	if (p instanceof m1.ExportPointerOnly){
		p2 = p;
		RTL$.assert(RTL$.typeGuard(p2, m1.ExportPointerOnly) != null);
	}
}
ptr = new m1.T();
pb = ptr;
RTL$.typeGuard(pb, m1.T).i = 123;
ptr2 = new T();
ptr2.i = 1;
ptr2.i2 = 2;
ptrA = m1.makeTPA();
m1.p();
p(m1.i());
p(m1.ci);
ref(RTL$.makeRef(m1.pr2(), "i"));
}(m1);
var m3 = function (m1, m2){
function T(){
	m2.T.call(this);
}
RTL$.extend(T, m2.T);
var r = new m2.T();
var r2 = new T();
var a = RTL$.makeArray(3, function(){return new m2.Base();});
var ptr = null;
var pb = null;
var pTPB = null;
ptr = new m2.T();
pb = ptr;
RTL$.typeGuard(pb, m2.T).i = 123;
pb = m2.makeTPB();
pTPB = RTL$.typeGuard(pb, m2.TPB);
m2.p();
}(m2, m1);
