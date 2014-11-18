var RTL$ = require("rtl.js");
var ci = 123;
function Base(){
	this.i = 0;
}
RTL$.extend(T, Base);
function T(){
	Base.call(this);
}
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
