"use strict";
/*
do not use Class here - IE8 does not understand overloeded toString method (using Class.extend).

var Class = require("rtl.js").Class;

exports.Error = Class.extend({
	init: function CompileError(msg) {this.__msg = msg;},
	toString: function(){return this.__msg;}
});
*/
function CompileError(msg){
    this.__msg = msg;
}

CompileError.prototype.toString = function(){
    return this.__msg;
};

exports.Error = CompileError;
