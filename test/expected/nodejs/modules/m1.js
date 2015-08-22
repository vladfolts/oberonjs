var RTL$ = require("test_rtl.js");
var $scope = "m1";
var ci = 123;
function Base(){
	this.i = 0;
}
Base.prototype.$scope = $scope;
function T(){
	Base.call(this);
}
RTL$.extend(T, Base, $scope);
function TPA(){
}
TPA.prototype.$scope = $scope;
function ExportPointerOnly(){
	Base.call(this);
}
RTL$.extend(ExportPointerOnly, Base, $scope);
var i = 0;
function anonymous$1(){
	this.i = 0;
}
anonymous$1.prototype.$scope = $scope;
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
exports.ExportPointerOnly = ExportPointerOnly;
exports.i = function(){return i;};
exports.pr = function(){return pr;};
exports.pr2 = function(){return pr2;};
exports.p = p;
exports.makeTPA = makeTPA;
exports.constructor$ = constructor;
exports.prototype$ = prototype;
