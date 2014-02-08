var RTL$ = require("rtl.js");
var JS = GLOBAL;
var JsString = require("js/JsString.js");
var Object = require("js/Object.js");
var Type = RTL$.extend({
	init: function Type(){
	}
});
var Strings = RTL$.extend({
	init: function Strings(){
	}
});

function make(){
	var result = null;
	result = {};
	return result;
}

function has(m/*Type*/, s/*Type*/){
	var result = false;
	result = m.hasOwnProperty(s);
	return result;
}

function find(m/*Type*/, s/*Type*/, r/*VAR PType*/){
	var result = false;
	var value = m[s]; if (value !== undefined){result = true; r.set(value);};
	return result;
}

function put(m/*Type*/, s/*Type*/, o/*PType*/){
	m[s] = o;
}

function erase(m/*Type*/, s/*Type*/){
	delete m[s];
}

function forEach(m/*Type*/, p/*ForEachProc*/, closure/*VAR Type*/){
	for(var key in m){p(key, m[key], closure)};
}

function forEachString(m/*Strings*/, p/*ForEachStringProc*/, closure/*VAR Type*/){
	for(var key in m){p(key, m[key], closure)};
}
exports.Type = Type;
exports.Strings = Strings;
exports.make = make;
exports.has = has;
exports.find = find;
exports.put = put;
exports.erase = erase;
exports.forEach = forEach;
exports.forEachString = forEachString;
