var RTL$ = require("rtl.js");
var JS = GLOBAL;
var Object = require("js/Object.js");
var JsString = require("js/JsString.js");
var Type = RTL$.extend({
	init: function Type(){
	}
});
var Strings = RTL$.extend({
	init: function Strings(){
	}
});

function len(a/*Type*/){
	var result = 0;
	result = a.length;
	return result;
}

function stringsLen(a/*Strings*/){
	var result = 0;
	result = a.length;
	return result;
}

function add(a/*Type*/, o/*PType*/){
	a.push(o);
}

function stringsAdd(a/*Strings*/, o/*Type*/){
	a.push(o);
}

function at(a/*Type*/, i/*INTEGER*/){
	var result = null;
	result = a[i];
	return result;
}

function stringsAt(a/*Strings*/, i/*INTEGER*/){
	var result = null;
	result = a[i];
	return result;
}

function contains(a/*Type*/, x/*PType*/){
	var result = false;
	result = (a.indexOf(x) != -1);
	return result;
}

function make(){
	var result = null;
	result = [];
	return result;
}

function makeStrings(){
	var result = null;
	result = [];
	return result;
}
exports.Type = Type;
exports.Strings = Strings;
exports.len = len;
exports.stringsLen = stringsLen;
exports.add = add;
exports.stringsAdd = stringsAdd;
exports.at = at;
exports.stringsAt = stringsAt;
exports.contains = contains;
exports.make = make;
exports.makeStrings = makeStrings;
