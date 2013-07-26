"use strict";

var Class = require("rtl.js").Class;
var Errors = require("errors.js");
var Type = require("type.js");

var Symbol = Class.extend({
	init: function Symbol(id, info){
		this.__id = id;
		this.__info = info;
	},
	id: function(){return this.__id;},
	info: function(){return this.__info;},
	isModule: function(){return this.__info instanceof Type.Module;},
	isVariable: function(){return this.__info instanceof Type.Variable;},
	isConst: function(){return this.__info instanceof Type.Const;},
	isType: function(){return this.__info instanceof Type.TypeId;},
	isProcedure: function(){return this.__info instanceof Type.Procedure;}
});

var FoundSymbol = Class.extend({
    init: function(symbol, scope){
        this.__symbol = symbol;
        this.__scope = scope;
    },
    symbol: function(){return this.__symbol;},
    scope: function(){return this.__scope;}
});

exports.Symbol = Symbol;
exports.Found = FoundSymbol;
