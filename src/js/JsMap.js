var RTL$ = require("rtl.js");
var JS = GLOBAL;
var JsString = require("js/JsString.js");
var Object = require("js/Object.js");
var Type = RTL$.extend({
	init: function Type(){
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
exports.Type = Type;
exports.make = make;
exports.has = has;
exports.find = find;
exports.put = put;
exports.erase = erase;
