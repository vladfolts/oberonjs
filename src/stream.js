"use strict";

var assert = require("assert.js").ok;
var Class = require("rtl.js").Class;

exports.Stream = Class.extend({
	init: function Stream(s){
		this.__s = s;
		this.__pos = 0;
	},
	str: function(n){return this.__s.substr(this.__pos, n);},
	getChar: function(){
		if (this.eof())
			return undefined;
		return this.__s.charAt(this.__pos++);
	},
	read: function(f){
		while (!this.eof() && f(this.peekChar()))
			this.next(1);
		return !this.eof();
	},
	peekChar: function(){
		if (this.eof())
			return undefined;
		return this.__s.charAt(this.__pos);
	},
	peekStr: function(size){
		var max = this.__s.length - this.__pos;
		if (size > max)
			size = max;
		return this.__s.substr(this.__pos, size);
	},
	next: function(n){
		assert(this.__pos + n <= this.__s.length);
		this.__pos += n;
	},
	pos: function(){return this.__pos;},
	setPos: function(pos){
		assert(pos <= this.__s.length);
		return this.__pos = pos;
	},
	eof: function(){return this.__pos == this.__s.length;},
	describePosition: function(){
		var line = this.__s.substr(0, this.__pos).split("\n").length;
		return "line " + line;
	}
});
