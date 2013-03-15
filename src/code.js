var Class = require("rtl.js").Class;

var NullCodeGenerator = Class.extend({
	init: function NullCodeGenerator(){},
	write: function(){}
});

exports.Generator = Class.extend({
	init: function CodeGenerator(){
		this.__result = "";
		this.__indent = "";
	},
	write: function(s){
		this.__result += s.replace(/\n/g, "\n" + this.__indent);
	},
	openScope: function(){
		this.__indent += "\t";
		this.__result += "{\n" + this.__indent;
	},
	closeScope: function(ending){
		this.__indent = this.__indent.substr(1);
		this.__result = this.__result.substr(0, this.__result.length - 1) + "}";
		if (ending)
			this.write(ending);
		else
			this.write("\n");
	},
	getResult: function(){return this.__result;}
});

exports.SimpleGenerator = Class.extend({
	init: function SimpleCodeGenerator(code){this.__result = code ? code : "";},
	write: function(s){this.__result += s;},
	result: function(){return this.__result;}
});

exports.nullGenerator = new NullCodeGenerator();
