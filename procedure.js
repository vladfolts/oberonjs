//var assert = require("assert").ok;
var Cast = require("cast.js");
var Class = require("rtl.js").Class;
var Code = require("code.js");
var Errors = require("errors.js");
var Type = require("type.js");

var Arg = Class.extend({
	init: function(type, isVar){
		this.type = type;
		this.isVar = isVar;
	},
	description: function(){
		return (this.isVar ? "VAR " : "") + this.type.description();
	}
});
exports.Arg = Arg;

var ProcCallGenerator = Class.extend({
	init: function ProcCallGenerator(codeGenerator, id, type){
		this.__codeGenerator = codeGenerator;
		this.__id = id;
		this.__type = type;
		this.__argumentsCount = 0;
		this.writeCode(this.prolog());
	},
	id: function(){return this.__id;},
	handleArgument: function(type, designator, code){
		var pos = this.__argumentsCount++;
		var isVarArg = false;
		if (this.__type){
			var expectedArguments = this.__type.arguments();
			if (pos >= expectedArguments.length )
				// ignore, handle error after parsing all arguments
				return;
			
			var arg = this.checkArgument(pos, type, designator);
			isVarArg = arg.isVar;
		}
		if (designator){
			var info = designator.info();
			if (info instanceof Type.Variable)
				if (info.isVar() && !isVarArg)
					code += ".get()";
				else if (!info.isVar() && isVarArg)
					code = designator.refCode();
			}
		var prefix = pos ? ", " : "";
		this.writeCode(prefix + code);
	},
	end: function(){
		if (this.__type){
			var procArgs = this.__type.arguments();
			if (this.__argumentsCount != procArgs.length)
				throw new Errors.Error(procArgs.length + " argument(s) expected, got "
									 + this.__argumentsCount);
		}
		this.writeCode(this.epilog());
		return this.__codeGenerator.result();
	},
	prolog: function(){return this.__id + "(";},
	checkArgument: function(pos, type, designator){
		var arg = this.__type.arguments()[pos];
		var expectType = arg.type; // can be undefined for predefined functions (like NEW), dont check it in this case
		if (expectType && !Cast.implicit(type, expectType))
			throw new Errors.Error("expect '" + expectType.name() + "' type for argument "
								 + pos + ", got '" + type.name() + "'");
		if (arg.isVar){
			if (!designator)
				throw new Errors.Error("expression cannot be used as VAR parameter");
			var info = designator.info();
			if (info instanceof Type.Const)
				throw new Errors.Error("constant cannot be used as VAR parameter");
			if (info.isReadOnly())
				throw new Errors.Error("read-only variable cannot be used as VAR parameter");
		}
		return arg;
	},
	epilog: function(){return ")";},
	writeCode: function(s){this.__codeGenerator.write(s);}
});

var ProcType = Type.Basic.extend({
	init: function ProcType(name, args, result, callGeneratorFactory){
		Type.Basic.prototype.init.bind(this)(name, "null");
		this.__arguments = args;
		this.__result = result;
		this.__callGeneratorFactory = callGeneratorFactory
			? callGeneratorFactory
			: function(codeGenerator, id, type){
				return new ProcCallGenerator(codeGenerator, id, type);
			};
	},
	isProcedure: function(){return true;},
	define: function(args, result){
		this.__arguments = args;
		this.__result = result;
	},
	arguments: function(){return this.__arguments;},
	result: function(){return this.__result;},
	description: function(){
		var name = this.name();
		if (name)
			return name;
		return 'PROCEDURE' + this.__dumpProcArgs()
			+ (this.__result ? ": " + this.__result.name() : "");
		},
	callGenerator: function(codeGenerator, id){
		return this.__callGeneratorFactory(codeGenerator, id, this);
	},
	__dumpProcArgs: function(){
		if (!this.__arguments.length)
			return this.__result ? "()" : "";
		
		var result = "(";
		for(var i = 0; i < this.__arguments.length; ++i){
			if (i)
				result += ", ";
			result += this.__arguments[i].description();
		}
		result += ")";
		return result;
	}
});

var TwoArgToOperatorProcCallGenerator = ProcCallGenerator.extend({
	init: function TwoArgToOperatorProcCallGenerator(codeGenerator, id, type, operator){
		ProcCallGenerator.prototype.init.bind(this)(Code.nullGenerator, id, type);
		this.__code = codeGenerator;
		this.__operator = operator;
		this.__firstArgumentCode = undefined;
		this.__secondArgumentCode = undefined;
	},
	prolog: function(id){return "";},
	handleArgument: function(type, designator, code){
		if (!this.__firstArgumentCode)
			this.__firstArgumentCode = code;
		else
			this.__secondArgumentCode = code;
		ProcCallGenerator.prototype.handleArgument.bind(this)(type, designator, code);
	},
	epilog: function(type){return "";},
	end: function(){
		return this.__operator(this.__firstArgumentCode, this.__secondArgumentCode);
	}
});

exports.predefined = [
	function(){
		var NewProcCallGenerator = ProcCallGenerator.extend({
			init: function NewProcCallGenerator(codeGenerator, id, type){
				ProcCallGenerator.prototype.init.bind(this)(codeGenerator, id, type);
				this.__baseType = undefined;
			},
			prolog: function(id){return "";},
			checkArgument: function(pos, type, designator){
				ProcCallGenerator.prototype.checkArgument.bind(this)(pos, type, designator);
				if (!(type instanceof Type.Pointer))
					throw new Errors.Error("POINTER variable expected, got '"
										 + type.name() + "'");
				this.__baseType = type.baseType();
				return new Arg(type, false);
			},
			epilog: function(){return " = new " + this.__baseType.name() + "()";}
		});

		var name = "NEW";
		var args = [new Arg(undefined, true)];
		var type = new Type.Procedure(new ProcType(
			"predefined procedure NEW",
			args,
			undefined,
			function(codeGenerator, id, type){
				return new NewProcCallGenerator(codeGenerator, id, type);
			}));
		var symbol = new Type.Symbol(name, type);
		return symbol;
	}(),
	function(){
		var args = [new Arg(Type.basic.set, true),
					new Arg(Type.basic.int, false)];
		function operator(x, y){return x + " |= 1 << " + y;}
		var proc = new ProcType(
			"predefined procedure INCL",
			args,
			undefined,
			function(codeGenerator, id, type){
				return new TwoArgToOperatorProcCallGenerator(
					codeGenerator, id, type, operator);
				});
		var type = new Type.Procedure(proc);
		var symbol = new Type.Symbol("INCL", type);
		return symbol;
	}(),
	function(){
		var args = [new Arg(Type.basic.set, true),
					new Arg(Type.basic.int, false)];
		function operator(x, y){return x + " &= ~(1 << " + y + ")";}
		var proc = new ProcType(
			"predefined procedure EXCL",
			args,
			undefined,
			function(codeGenerator, id, type){
				return new TwoArgToOperatorProcCallGenerator(
					codeGenerator, id, type, operator);
				});
		var type = new Type.Procedure(proc);
		var symbol = new Type.Symbol("EXCL", type);
		return symbol;
	}()
	];

exports.CallGenerator = ProcCallGenerator;
exports.Type = ProcType;
