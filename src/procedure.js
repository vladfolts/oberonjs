"use strict";

var Cast = require("cast.js");
var Class = require("rtl.js").Class;
var Code = require("code.js");
var Errors = require("errors.js");
var op = require("operator.js");
var precedence = require("operator.js").precedence;
var Symbol = require("symbol.js");
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

var CheckArgumentResult = Arg.extend({
    init: function(type, isVar, convert){
        Arg.prototype.init.call(this, type, isVar);
        this.convert = convert;
    }
});

var ProcCallGenerator = Class.extend({
    init: function ProcCallGenerator(context, id, type){
        this.__context = context;
        this.__id = id;
        this.__type = type;
        this.__argumentsCount = 0;
        this.__code = new Code.SimpleGenerator();
        this.writeCode(this.prolog());
    },
    //id: function(){return this.__id;},
    context: function(){return this.__context;},
    handleArgument: function(e){
        var pos = this.__argumentsCount++;
        var isVarArg = false;
        var convert;
        if (this.__type){
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
        e = isVar ? e.ref() : e.deref();
        var code = (convert ? convert(this.__context, e) : e).code();
        var prefix = pos ? ", " : "";
        this.writeCode(prefix + code);
    },
    end: function(){
        if (this.__type)
            this.checkArgumentsCount(this.__argumentsCount);
        return this.callExpression();
    },
    callExpression: function(){
        this.writeCode(this.epilog());
        return new Code.Expression(this.__code.result(),
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
            castOperation = Cast.implicit(type, expectType);
            if (!castOperation)
                throw new Errors.Error("type mismatch for argument " + (pos + 1) + ": '" + type.description()
                                     + "' cannot be converted to '" + expectType.description() + "'");
        }
        if (arg.isVar){
            var designator = e.designator();
            if (!designator)
                throw new Errors.Error("expression cannot be used as VAR parameter");
            var info = designator.info();
            if (info instanceof Type.Const)
                throw new Errors.Error("constant cannot be used as VAR parameter");
            if (info.isReadOnly())
                throw new Errors.Error(info.idType() + " cannot be used as VAR parameter");
        }
        return new CheckArgumentResult(arg.type, arg.isVar, castOperation);
    },
    epilog: function(){return ")";},
    writeCode: function(s){this.__code.write(s);}
});

var DefinedProc = Type.Procedure.extend({
    init: function DefinedProc(name){
        Type.Procedure.prototype.init.call(this, name);
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
        var name = this.name();
        if (name)
            return name;
        return 'PROCEDURE' + this.__dumpProcArgs()
            + (this.__result ? ": " + this.__result.name() : "");
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
        Type.Procedure.prototype.init.call(this, name);
        this.__arguments = args;
        this.__result = result;
        this.__callGeneratorFactory = callGeneratorFactory;
    },
    description: function(){return "standard procedure " + this.name();},
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
        return new Code.Expression(this.__operator(args[0], args[1]));
    }
});

function setBitImpl(name, op){
    var args = [new Arg(Type.basic.set, true),
                new Arg(Type.basic.integer, false)];
    function operator(x, y){
        var value = y.constValue();
        if (value === undefined || value < 0 || value > 31)
            throw new Errors.Error("constant (0..31) expected as second argument of " + name);
        var comment = "bit: " + (y.isTerm() ? value : Code.adjustPrecedence(y, precedence.shift));
        value = 1 << value;
        var valueCode = value + "/*" + comment + "*/";
        return op(Code.adjustPrecedence(x, precedence.assignment), valueCode);
    }
    var proc = new Std(
        name,
        args,
        undefined,
        function(context, id, type){
            return new TwoArgToOperatorProcCallGenerator(
                context, id, type, operator);
            });
    var symbol = new Symbol.Symbol(name, proc);
    return symbol;
}

function incImpl(name, unary, op){
    var args = [new Arg(Type.basic.integer, true),
                new Arg(Type.basic.integer, false)];
    function operator(x, y){
        if (!y)
            return unary + x.code();

        var value = y.constValue();
        if (value === undefined)
            throw new Errors.Error("constant expected as second argument of " + name);
        var comment = y.isTerm() ? "" : "/*" + y.code() + "*/";
        var valueCode = value + comment;
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
    var symbol = new Symbol.Symbol(name, proc);
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
    var args = [new Arg(Type.basic.integer, false),
                new Arg(Type.basic.integer, false)
               ];
    var proc = new Std(
        name,
        args,
        Type.basic.integer,
        function(context, id, type){
            return new CallGenerator(context, id, type);
        });
    var symbol = new Symbol.Symbol(name, proc);
    return symbol;
}

function longShort(name){
    var CallGenerator = ExpCallGenerator.extend({
        init: function LongShortCallGenerator(context, id, type){
            ExpCallGenerator.prototype.init.call(this, context, id, type);
        },
        callExpression: function(){return this.args()[0];}
    });
    var args = [new Arg(Type.basic.real, false)];
    var proc = new Std(
        name,
        args,
        Type.basic.real,
        function(context, id, type){
            return new CallGenerator(context, id, type);
        });
    var symbol = new Symbol.Symbol(name, proc);
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
                                         + type.name() + "'");
                this.__baseType = type.baseType();
                return new CheckArgumentResult(type, false);
            },
            epilog: function(){
                return " = new " + this.__baseType.cons() + "()";
            }
        });

        var name = "NEW";
        var args = [new Arg(undefined, true)];
        var type = new Std(
            "NEW",
            args,
            undefined,
            function(context, id, type){
                return new NewProcCallGenerator(context, id, type);
            });
        var symbol = new Symbol.Symbol(name, type);
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
        var args = [new Arg(new Type.Array("ARRAY OF any type"), false)];
        var type = new Std(
            name,
            args,
            Type.basic.integer,
            function(context, id, type){
                return new LenProcCallGenerator(context, id, type);
            });
        var symbol = new Symbol.Symbol(name, type);
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
                return new Code.Expression(code + " & 1", Type.basic.bool, undefined, e.constValue(), precedence.bitAnd);
            }
        });
        var name = "ODD";
        var args = [new Arg(Type.basic.integer, false)];
        var type = new Std(
            "ODD",
            args,
            Type.basic.bool,
            function(context, id, type){
                return new CallGenerator(context, id, type);
            });
        var symbol = new Symbol.Symbol(name, type);
        return symbol;
    }(),
    function(){
        var AssertProcCallGenerator = ProcCallGenerator.extend({
            init: function AssertProcCallGenerator(context, id, type){
                ProcCallGenerator.prototype.init.call(this, context, id, type);
            },
            prolog: function(){return this.context().rtl().assertId() + "(";},
            checkArgumentsCount: function(count){
                checkVariableArgumentsCount(1, 2, count);
            }
        });

        var args = [new Arg(Type.basic.bool), new Arg(Type.basic.integer)];
        var proc = new Std(
            "ASSERT",
            args,
            undefined,
            function(context, id, type){
                return new AssertProcCallGenerator(context, id, type);
            });
        var symbol = new Symbol.Symbol("ASSERT", proc);
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
                if (Type.numeric.indexOf(type) == -1)
                    throw new Errors.Error("type mismatch: expected numeric type, got '" +
                                           type.description() + "'");
                this.__argType = type;
                return ProcCallGenerator.prototype.checkArgument.call(this, pos, e);
            },
            resultType: function(){return this.__argType;}
        });
        var args = [new Arg(undefined, false)];
        var proc = new Std(
            "ABS",
            args,
            undefined,
            function(context, id, type){
                return new CallGenerator(context, id, type);
            });
        var symbol = new Symbol.Symbol("ABS", proc);
        return symbol;
    }(),
    function(){
        var CallGenerator = ProcCallGenerator.extend({
            init: function FloorProcCallGenerator(context, id, type){
                ProcCallGenerator.prototype.init.call(this, context, id, type);
            },
            prolog: function(){return "Math.floor(";}
        });
        var args = [new Arg(Type.basic.real, false)];
        var proc = new Std(
            "FLOOR",
            args,
            Type.basic.integer,
            function(context, id, type){
                return new CallGenerator(context, id, type);
            });
        var symbol = new Symbol.Symbol("FLOOR", proc);
        return symbol;
    }(),
    function(){
        var CallGenerator = ExpCallGenerator.extend({
            init: function FltProcCallGenerator(context, id, type){
                ExpCallGenerator.prototype.init.call(this, context, id, type);
            },
            callExpression: function(){
                var e = this.args()[0];
                return new Code.Expression(e.code(), Type.basic.real, undefined, e.constValue(), e.maxPrecedence());
            }
        });
        var args = [new Arg(Type.basic.integer, false)];
        var proc = new Std(
            "FLT",
            args,
            Type.basic.real,
            function(context, id, type){
                return new CallGenerator(context, id, type);
            });
        var symbol = new Symbol.Symbol("FLT", proc);
        return symbol;
    }(),
    longShort("LONG"),
    longShort("SHORT"),
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
                if (type == Type.basic.ch || type == Type.basic.set)
                    this.__callExpression = new Code.Expression(
                        e.code(), Type.basic.integer, undefined, e.constValue());
                else if (type == Type.basic.bool){
                    var code = Code.adjustPrecedence(e, precedence.conditional) + " ? 1 : 0";
                    var value = e.constValue();
                    if (value !== undefined)
                        value = value ? 1 : 0;
                    this.__callExpression = new Code.Expression(
                        code, Type.basic.integer, undefined, value, precedence.conditional);
                }
                else if (type instanceof Type.String){
                    var ch = type.asChar();
                    if (ch !== undefined)
                        this.__callExpression = new Code.Expression(
                            "" + ch, Type.basic.integer);
                }
                
                if (this.__callExpression)
                    return new CheckArgumentResult(type, false);

                // should throw error
                return ProcCallGenerator.prototype.checkArgument.call(this, pos, e);
            },
            callExpression: function(){return this.__callExpression;}
        });
        var name = "ORD";
        var argType = new Type.Basic("CHAR or BOOLEAN or SET");
        var args = [new Arg(argType, false)];
        var type = new Std(
            name,
            args,
            Type.basic.integer,
            function(context, id, type){
                return new CallGenerator(context, id, type);
            });
        var symbol = new Symbol.Symbol(name, type);
        return symbol;
    }(),
    function(){
        var CallGenerator = ExpCallGenerator.extend({
            init: function ChrProcCallGenerator(context, id, type){
                ExpCallGenerator.prototype.init.call(this, context, id, type);
            },
            callExpression: function(){
                return new Code.Expression(this.args()[0].code(), Type.basic.ch);
            }
        });
        var name = "CHR";
        var type = new Std(
            name,
            [new Arg(Type.basic.integer, false)],
            Type.basic.ch,
            function(context, id, type){
                return new CallGenerator(context, id, type);
            });
        var symbol = new Symbol.Symbol(name, type);
        return symbol;
    }(),
    function(){
        var CallGenerator = ExpCallGenerator.extend({
            init: function CopyProcCallGenerator(context, id, type){
                ExpCallGenerator.prototype.init.call(this, context, id, type);
            },
            callExpression: function(){
                var args = this.args();
                return new Code.Expression(op.assign(args[1], args[0], this.context()));
            }
        });
        var name = "COPY";
        var type = new Std(
            name,
            [new Arg(undefined, false),
             new Arg(new Type.Array("ARRAY OF CHAR", undefined, Type.basic.ch), true)],
            undefined,
            function(context, id, type){
                return new CallGenerator(context, id, type);
            });
        var symbol = new Symbol.Symbol(name, type);
        return symbol;
    }(),
    function(){
        var args = [new Arg(Type.basic.real, true),
                    new Arg(Type.basic.integer, false)];
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
        var symbol = new Symbol.Symbol(name, proc);
        return symbol;
    }(),
    function(){
        var args = [new Arg(Type.basic.real, true),
                    new Arg(Type.basic.integer, true)];
        function operator(x, y){
            return op.assign(y, op.log2(x)) +
                   "; " +
                   op.divInplace(x, op.pow2(y));
        }
        var name = "UNPACK";
        var proc = new Std(
            name,
            args,
            undefined,
            function(context, id, type){
                return new TwoArgToOperatorProcCallGenerator(
                    context, id, type, operator);
                });
        var symbol = new Symbol.Symbol(name, proc);
        return symbol;
    }()
    ];

exports.CallGenerator = ProcCallGenerator;
exports.Type = DefinedProc;
exports.Std = Std;
