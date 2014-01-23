"use strict";

var Cast = require("js/Cast.js");
var Class = require("rtl.js").Class;
var Code = require("js/Code.js");
var Errors = require("js/Errors.js");
var op = require("js/Operator.js");
var precedence = require("js/CodePrecedence.js");
var Symbol = require("js/Symbols.js");
var Type = require("js/Types.js");

var basicTypes = Type.basic();

var Arg = Type.ProcedureArgument;
var makeArg = Type.makeProcedureArgument;

var CheckArgumentResult = Arg.extend({
    init: function(type, isVar, convert){
        Arg.prototype.init.call(this);
        this.type = type;
        this.isVar = isVar;
        this.convert = convert;
    }
});

var ProcCallGenerator = Class.extend({
    init: function ProcCallGenerator(context, id, type){
        this.__context = context;
        this.__id = id;
        this.__type = type;
        this.__argumentsCount = 0;
        this.__code = Code.makeSimpleGenerator();
        this.writeCode(this.prolog());
    },
    //id: function(){return this.__id;},
    context: function(){return this.__context;},
    handleArgument: function(e){
        var pos = this.__argumentsCount++;
        var isVarArg = false;
        var convert;
        if (this.__type.args){
            var expectedArguments = this.__type.args();
            if (pos >= expectedArguments.length )
                // ignore, handle error after parsing all arguments
                return;
            
            var arg = this.checkArgument(pos, e);
            isVarArg = arg.isVar;
            convert = arg.convert;
        }
        this.writeArgumentCode(e, pos, isVarArg, convert);
    },
    writeArgumentCode: function(e, pos, isVar, convert){
        e = (isVar ? Code.refExpression : Code.derefExpression)(e);
        var code = (convert ? convert(this.__context, e) : e).code();
        var prefix = pos ? ", " : "";
        this.writeCode(prefix + code);
    },
    end: function(){
        if (this.__type.args)
            this.checkArgumentsCount(this.__argumentsCount);
        return this.callExpression();
    },
    callExpression: function(){
        this.writeCode(this.epilog());
        return Code.makeExpression(this.__code.result(),
                                   this.resultType());
    },
    resultType: function(){return this.__type ? this.__type.result() : undefined;},
    prolog: function(){return this.__id + "(";},
    checkArgumentsCount: function(count){
        var procArgs = this.__type.args();
        if (count != procArgs.length)
            throw new Errors.Error(procArgs.length + " argument(s) expected, got "
                                 + this.__argumentsCount);
    },
    checkArgument: function(pos, e){
        var arg = this.__type.args()[pos];
        var castOperation;
        var expectType = arg.type; // can be undefined for predefined functions (like NEW), dont check it in this case
        if (expectType){
            var type = e.type();
            castOperation = Cast.implicit(type, expectType, op.castOperations());
            if (!castOperation)
                throw new Errors.Error(
                      "type mismatch for argument " + (pos + 1) + ": '" + type.description()
                    + "' cannot be converted to '" + expectType.description() + "'");
            castOperation = castOperation.make.bind(castOperation);
            if (arg.isVar && expectType != type && Type.isInt(type))
                throw new Errors.Error(
                      "type mismatch for argument " + (pos + 1) + ": cannot pass '" 
                    + type.description() + "' as VAR parameter of type '" + expectType.description() + "'");
        }
        if (arg.isVar){
            var designator = e.designator();
            if (!designator)
                throw new Errors.Error("expression cannot be used as VAR parameter");
            var info = designator.info();
            if (info instanceof Type.Const)
                throw new Errors.Error("constant cannot be used as VAR parameter");
            if (Type.isVariableReadOnly(info))
                throw new Errors.Error(info.idType() + " cannot be used as VAR parameter");
        }
        return new CheckArgumentResult(arg.type, arg.isVar, castOperation);
    },
    epilog: function(){return ")";},
    writeCode: function(s){this.__code.write(s);}
});

var DefinedProc = Type.Procedure.extend({
    init: function DefinedProc(name){
        Type.Procedure.prototype.init.call(this);
        Type.initProcedure(this, name);
        this.__arguments = undefined;
        this.__result = undefined;
    },
    define: function(args, result){
        this.__arguments = args;
        this.__result = result;
    },
    args: function(){return this.__arguments;},
    result: function(){return this.__result;},
    description: function(){
        var name = Type.typeName(this);
        if (name)
            return name;
        return 'PROCEDURE' + this.__dumpProcArgs()
            + (this.__result ? ": " + Type.typeName(this.__result) : "");
        },
    callGenerator: function(context, id){
        return new ProcCallGenerator(context, id, this);
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

var Std = Type.Procedure.extend({
    init: function Std(name, args, result, callGeneratorFactory){
        Type.Procedure.prototype.init.call(this);
        Type.initProcedure(this, name);
        this.__arguments = args;
        this.__result = result;
        this.__callGeneratorFactory = callGeneratorFactory;
    },
    description: function(){return "standard procedure " + Type.typeName(this);},
    args: function(){return this.__arguments;},
    result: function(){return this.__result;},
    callGenerator: function(context, id){
        return this.__callGeneratorFactory(context, id, this);
    }
});

var ExpCallGenerator = ProcCallGenerator.extend({
    init: function ExpCallGenerator(context, id, type){
        ProcCallGenerator.prototype.init.call(this, context, id, type);
        this.__args = [];
    },
    prolog: function(){return "";},
    epilog: function(){return "";},
    writeArgumentCode: function(){},
    checkArgument: function(pos, e){
        this.__args.push(e);
        return ProcCallGenerator.prototype.checkArgument.call(this, pos, e);
    },
    args: function(){return this.__args;}
});

var TwoArgToOperatorProcCallGenerator = ExpCallGenerator.extend({
    init: function TwoArgToOperatorProcCallGenerator(context, id, type, operator){
        ExpCallGenerator.prototype.init.call(this, context, id, type);
        this.__operator = operator;
    },
    callExpression: function(){
        var args = this.args();
        return Code.makeExpression(this.__operator(args[0], args[1]));
    }
});

function makeProcSymbol(name, proc){
    return Symbol.makeSymbol(name, Type.makeProcedure(proc));
}

function setBitImpl(name, bitOp){
    var args = [makeArg(basicTypes.set, true),
                makeArg(basicTypes.integer, false)];
    function operator(x, y){
        var value = y.constValue();
        var valueCode;
        if (!value)
            valueCode = op.lsl(Code.makeExpression("1"), y).code();
        else {
            if (value.value < 0 || value.value > 31)
                throw new Errors.Error("value (0..31) expected as a second argument of " + name + ", got " + value.value);
            var comment = "bit: " + (y.isTerm() ? value.value : Code.adjustPrecedence(y, precedence.shift));
            value = 1 << value.value;
            valueCode = value + "/*" + comment + "*/";
        }
        return bitOp(Code.adjustPrecedence(x, precedence.assignment), valueCode);
    }
    var proc = new Std(
        name,
        args,
        undefined,
        function(context, id, type){
            return new TwoArgToOperatorProcCallGenerator(
                context, id, type, operator);
            });
    var symbol = makeProcSymbol(name, proc);
    return symbol;
}

function incImpl(name, unary, op){
    var args = [makeArg(basicTypes.integer, true),
                makeArg(basicTypes.integer, false)];
    function operator(x, y){
        if (!y)
            return unary + x.code();

        var value = y.constValue();
        var valueCode;
        if (!value)
            valueCode = y.code();
        else {
            var comment = y.isTerm() ? "" : "/*" + y.code() + "*/";
            valueCode = value.value + comment;
        }
        return op(x.code(), valueCode);
    }
    var CallGenerator = TwoArgToOperatorProcCallGenerator.extend({
        init: function IncDecProcCallGenerator(context, id, type, operator){
            TwoArgToOperatorProcCallGenerator.prototype.init.call(this, context, id, type, operator);
        },
        checkArgumentsCount: function(count){
            checkVariableArgumentsCount(1, 2, count);
        }
    });
    var proc = new Std(
        name,
        args,
        undefined,
        function(context, id, type){
            return new CallGenerator(
                context, id, type, operator);
            });
    var symbol = makeProcSymbol(name, proc);
    return symbol;
}

function bitShiftImpl(name, op){
    var CallGenerator = ExpCallGenerator.extend({
        init: function ShiftProcCallGenerator(context, id, type){
            ExpCallGenerator.prototype.init.call(this, context, id, type);
        },
        callExpression: function(){
            var args = this.args();
            return op(args[0], args[1]);
        }
    });
    var args = [makeArg(basicTypes.integer, false),
                makeArg(basicTypes.integer, false)
               ];
    var proc = new Std(
        name,
        args,
        basicTypes.integer,
        function(context, id, type){
            return new CallGenerator(context, id, type);
        });
    var symbol = makeProcSymbol(name, proc);
    return symbol;
}

function checkVariableArgumentsCount(min, max, actual){
    if (actual < min)
        throw new Errors.Error("at least " + min + " argument expected, got " + actual);
    if (actual > max )
        throw new Errors.Error("at most " + max + " arguments expected, got " + actual);
}

exports.predefined = [
    function(){
        var NewProcCallGenerator = ProcCallGenerator.extend({
            init: function NewProcCallGenerator(context, id, type){
                ProcCallGenerator.prototype.init.call(this, context, id, type);
                this.__baseType = undefined;
            },
            prolog: function(id){return "";},
            checkArgument: function(pos, e){
                ProcCallGenerator.prototype.checkArgument.call(this, pos, e);

                var type = e.type();
                if (!(type instanceof Type.Pointer))
                    throw new Errors.Error("POINTER variable expected, got '"
                                         + Type.typeName(type) + "'");
                this.__baseType = Type.pointerBase(type);
                if (this.__baseType instanceof Type.NonExportedRecord)
                    throw new Errors.Error("non-exported RECORD type cannot be used in NEW");
                return new CheckArgumentResult(type, false);
            },
            epilog: function(){
                return " = " + this.__baseType.initializer(this.context());
            }
        });

        var name = "NEW";
        var args = [makeArg(undefined, true)];
        var type = new Std(
            name,
            args,
            undefined,
            function(context, id, type){
                return new NewProcCallGenerator(context, id, type);
            });
        var symbol = makeProcSymbol(name, type);
        return symbol;
    }(),
    function(){
        var LenProcCallGenerator = ProcCallGenerator.extend({
            init: function LenProcCallGenerator(context, id, type){
                ProcCallGenerator.prototype.init.call(this, context, id, type);
            },
            prolog: function(id){return "";},
            checkArgument: function(pos, e){
                var type = e.type();
                if (type instanceof Type.Array || type instanceof Type.String)
                    return new CheckArgumentResult(type, false);
                
                // should throw error
                return ProcCallGenerator.prototype.checkArgument.call(this, pos, e);
            },
            epilog: function(){return ".length";}
        });

        var name = "LEN";
        var args = [makeArg(Type.makeArray("ARRAY OF any type", undefined, undefined, 0), false)];
        var type = new Std(
            name,
            args,
            basicTypes.integer,
            function(context, id, type){
                return new LenProcCallGenerator(context, id, type);
            });
        var symbol = makeProcSymbol(name, type);
        return symbol;
    }(),
    function(){
        var CallGenerator = ExpCallGenerator.extend({
            init: function OddProcCallGenerator(context, id, type){
                ExpCallGenerator.prototype.init.call(this, context, id, type);
            },
            callExpression: function(){
                var e = this.args()[0];
                var code = Code.adjustPrecedence(e, precedence.bitAnd);
                return Code.makeExpressionWithPrecedence(
                    code + " & 1", basicTypes.bool, undefined, e.constValue(), precedence.bitAnd);
            }
        });
        var name = "ODD";
        var args = [makeArg(basicTypes.integer, false)];
        var type = new Std(
            "ODD",
            args,
            basicTypes.bool,
            function(context, id, type){
                return new CallGenerator(context, id, type);
            });
        var symbol = makeProcSymbol(name, type);
        return symbol;
    }(),
    function(){
        var AssertProcCallGenerator = ProcCallGenerator.extend({
            init: function AssertProcCallGenerator(context, id, type){
                ProcCallGenerator.prototype.init.call(this, context, id, type);
            },
            prolog: function(){return this.context().rtl().assertId() + "(";}
        });

        var args = [makeArg(basicTypes.bool)];
        var proc = new Std(
            "ASSERT",
            args,
            undefined,
            function(context, id, type){
                return new AssertProcCallGenerator(context, id, type);
            });
        var symbol = makeProcSymbol("ASSERT", proc);
        return symbol;
    }(),
    setBitImpl("INCL", function(x, y){return x + " |= " + y;}),
    setBitImpl("EXCL", function(x, y){return x + " &= ~(" + y + ")";}),
    incImpl("INC", "++", function(x, y){return x + " += " + y;}),
    incImpl("DEC", "--", function(x, y){return x + " -= " + y;}),
    function(){
        var CallGenerator = ProcCallGenerator.extend({
            init: function AbsProcCallGenerator(context, id, type){
                ProcCallGenerator.prototype.init.call(this, context, id, type);
                this.__argType = undefined;
            },
            prolog: function(){return "Math.abs(";},
            checkArgument: function(pos, e){
                var type = e.type();
                if (Type.numeric().indexOf(type) == -1)
                    throw new Errors.Error("type mismatch: expected numeric type, got '" +
                                           type.description() + "'");
                this.__argType = type;
                return ProcCallGenerator.prototype.checkArgument.call(this, pos, e);
            },
            resultType: function(){return this.__argType;}
        });
        var args = [makeArg(undefined, false)];
        var proc = new Std(
            "ABS",
            args,
            undefined,
            function(context, id, type){
                return new CallGenerator(context, id, type);
            });
        var symbol = makeProcSymbol("ABS", proc);
        return symbol;
    }(),
    function(){
        var CallGenerator = ProcCallGenerator.extend({
            init: function FloorProcCallGenerator(context, id, type){
                ProcCallGenerator.prototype.init.call(this, context, id, type);
            },
            prolog: function(){return "Math.floor(";}
        });
        var args = [makeArg(basicTypes.real, false)];
        var proc = new Std(
            "FLOOR",
            args,
            basicTypes.integer,
            function(context, id, type){
                return new CallGenerator(context, id, type);
            });
        var symbol = makeProcSymbol("FLOOR", proc);
        return symbol;
    }(),
    function(){
        var CallGenerator = ExpCallGenerator.extend({
            init: function FltProcCallGenerator(context, id, type){
                ExpCallGenerator.prototype.init.call(this, context, id, type);
            },
            callExpression: function(){
                var e = this.args()[0];
                var value = e.constValue();
                return Code.makeExpressionWithPrecedence(
                    e.code(), 
                    basicTypes.real, 
                    undefined, 
                    value ? Code.makeRealConst(value.value) : value, 
                    e.maxPrecedence()
                    );
            }
        });
        var args = [makeArg(basicTypes.integer, false)];
        var proc = new Std(
            "FLT",
            args,
            basicTypes.real,
            function(context, id, type){
                return new CallGenerator(context, id, type);
            });
        var symbol = makeProcSymbol("FLT", proc);
        return symbol;
    }(),
    bitShiftImpl("LSL", op.lsl),
    bitShiftImpl("ASR", op.asr),
    bitShiftImpl("ROR", op.ror),
    function(){
        var CallGenerator = ProcCallGenerator.extend({
            init: function OrdProcCallGenerator(context, id, type){
                ProcCallGenerator.prototype.init.call(this, context, id, type);
                this.__callExpression = undefined;
            },
            prolog: function(){return "";},
            epilog: function(){return "";},
            checkArgument: function(pos, e){
                var type = e.type();
                if (type == basicTypes.ch || type == basicTypes.set)
                    this.__callExpression = Code.makeExpression(
                        e.code(), basicTypes.integer, undefined, e.constValue());
                else if (type == basicTypes.bool){
                    var code = Code.adjustPrecedence(e, precedence.conditional) + " ? 1 : 0";
                    var value = e.constValue();
                    if (value)
                        value = Code.makeIntConst(value.value ? 1 : 0);
                    this.__callExpression = Code.makeExpressionWithPrecedence(
                        code, basicTypes.integer, undefined, value, precedence.conditional);
                }
                else if (type instanceof Type.String){
                    var ch;
                    if (Type.stringAsChar(type, {set: function(v){ch = v;}}))
                        this.__callExpression = Code.makeExpression(
                            "" + ch, basicTypes.integer);
                }
                
                if (this.__callExpression)
                    return new CheckArgumentResult(type, false);

                throw new Errors.Error(
                      "ORD function expects CHAR or BOOLEAN or SET as an argument, got '" + type.description()+ "'");
            },
            callExpression: function(){return this.__callExpression;}
        });
        var name = "ORD";
        //var argType = new basicTypes("CHAR or BOOLEAN or SET");
        var args = [makeArg(undefined, false)];
        var type = new Std(
            name,
            args,
            basicTypes.integer,
            function(context, id, type){
                return new CallGenerator(context, id, type);
            });
        var symbol = makeProcSymbol(name, type);
        return symbol;
    }(),
    function(){
        var CallGenerator = ExpCallGenerator.extend({
            init: function ChrProcCallGenerator(context, id, type){
                ExpCallGenerator.prototype.init.call(this, context, id, type);
            },
            callExpression: function(){
                return Code.makeExpression(this.args()[0].code(), basicTypes.ch);
            }
        });
        var name = "CHR";
        var type = new Std(
            name,
            [makeArg(basicTypes.integer, false)],
            basicTypes.ch,
            function(context, id, type){
                return new CallGenerator(context, id, type);
            });
        var symbol = makeProcSymbol(name, type);
        return symbol;
    }(),
    function(){
        var args = [makeArg(basicTypes.real, true),
                    makeArg(basicTypes.integer, false)];
        function operator(x, y){
            return op.mulInplace(x, op.pow2(y));
        }
        var name = "PACK";
        var proc = new Std(
            name,
            args,
            undefined,
            function(context, id, type){
                return new TwoArgToOperatorProcCallGenerator(
                    context, id, type, operator);
                });
        var symbol = makeProcSymbol(name, proc);
        return symbol;
    }(),
    function(){
        var args = [makeArg(basicTypes.real, true),
                    makeArg(basicTypes.integer, true)];
        function operator(x, y){
            return op.assign(y, op.log2(x)) +
                   "; " +
                   op.divInplace(x, op.pow2(y));
        }
        var name = "UNPK";
        var proc = new Std(
            name,
            args,
            undefined,
            function(context, id, type){
                return new TwoArgToOperatorProcCallGenerator(
                    context, id, type, operator);
                });
        var symbol = makeProcSymbol(name, proc);
        return symbol;
    }()
    ];

exports.CallGenerator = ProcCallGenerator;
exports.Type = DefinedProc;
exports.Std = Std;
