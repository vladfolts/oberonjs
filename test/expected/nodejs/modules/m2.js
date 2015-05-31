var RTL$ = require("test_rtl.js");
var m1 = require("m1.js");
var r = new m1.T();
var pb = null;
var ptr = null;
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
ptrA = m1.makeTPA();
m1.p();
p(m1.i());
p(m1.ci);
ref(RTL$.makeRef(m1.pr2(), "i"));
m1.constructor$();
m1.prototype$();
