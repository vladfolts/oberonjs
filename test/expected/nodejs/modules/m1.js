var RTL$ = require("test_rtl.js");
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

function constructor(){
}

function prototype(){
}
pr = new anonymous$1();
exports.ci = ci;
exports.Base = Base;
exports.T = T;
exports.TPA = TPA;
exports.i = function(){return i;};
exports.pr = function(){return pr;};
exports.pr2 = function(){return pr2;};
exports.p = p;
exports.makeTPA = makeTPA;
exports.constructor$ = constructor;
exports.prototype$ = prototype;
