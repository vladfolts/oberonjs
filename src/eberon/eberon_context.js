"use strict";

var Cast = require("js/Cast.js");
var Class = require("rtl.js").Class;
var Code = require("js/Code.js");
var CodeGenerator = require("js/CodeGenerator.js");
var Context = require("context.js");
var ContextCase = require("js/ContextCase.js");
var ContextConst = require("js/ContextConst.js");
var ContextDesignator = require("js/ContextDesignator.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextIdentdef = require("js/ContextIdentdef.js");
var ContextIf = require("js/ContextIf.js");
var ContextLoop = require("js/ContextLoop.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var ContextProcedure = require("js/ContextProcedure.js");
var ContextType = require("js/ContextType.js");
var ContextVar = require("js/ContextVar.js");
var EberonConstructor= require("js/EberonConstructor.js");
var EberonContext= require("js/EberonContext.js");
var EberonDynamicArray = require("js/EberonDynamicArray.js");
var EberonMap = require("js/EberonMap.js");
var EberonRecord = require("js/EberonRecord.js");
var EberonScope = require("js/EberonScope.js");
var EberonString = require("js/EberonString.js");
var EberonTypes = require("js/EberonTypes.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var op = require("js/Operator.js");
var eOp = require("js/EberonOperator.js");
var Symbol = require("js/Symbols.js");
var Procedure = require("js/Procedure.js");
var Record = require("js/Record.js");
var Type = require("js/Types.js");
var TypeId = require("js/TypeId.js");
var TypePromotion = require("eberon/eberon_type_promotion.js");
var Variable = require("js/Variable.js");

/*
function log(s){
    console.info(s);
}
*/

function superMethodCallGenerator(context, type){
    var args = Procedure.makeArgumentsCode(context);
    args.write(Expression.make("this"));
    return Procedure.makeProcCallGeneratorWithCustomArgs(context, type, args);
}

function MethodOrProcMsg(id, type){
    this.id = id;
    this.type = type;
}

var ProcOrMethodId = Context.Chained.extend({
    init: function EberonContext$ProcOrMethodId(parent){
        Context.Chained.prototype.init.call(this, parent);
        this.__maybeTypeId = undefined;
        this.__type = undefined;
    },
    handleIdent: function(id){this.__maybeTypeId = id;},
    handleLiteral: function(s){
        var ss = ContextHierarchy.getSymbolAndScope(this.root(), this.__maybeTypeId);
        var type = ContextExpression.unwrapType(ss.symbol().info());
        if (!(type instanceof Type.Record))
            throw new Errors.Error(
                  "RECORD type expected in method declaration, got '"
                + type.description() + "'");
        if (ss.scope() != this.root().currentScope())
            throw new Errors.Error(
                  "method should be defined in the same scope as its bound type '"
                + this.__maybeTypeId
                + "'");
        this.__type = type;
    },
    handleIdentdef: function(id){
        if (this.__type && id.exported())
            throw new Errors.Error("method implementation cannot be exported: " + id.id());
        checkOrdinaryExport(id, "procedure");
        this.handleMessage(new MethodOrProcMsg(id, this.__type));
    }
});

var MethodHeading = Context.Chained.extend({
    init: function EberonContext$MethodHeading(parent){
        Context.Chained.prototype.init.call(this, parent);
        this.__id = undefined;
        this.__type = undefined;
    },
    handleIdentdef: function(id){
        checkOrdinaryExport(id, "method");
        this.__id = id;
    },
    typeName: function(){return "";},
    setType: function(type){this.__type = type;},
    endParse: function(){
        this.handleMessage(new MethodOrProcMsg(this.__id, this.__type));
    }
});

function getMethodSelf(){}
function getSelfAsPointerMsg(){}
function getMethodSuper(){}

var ResultVariable = Class.extend.call(Type.Variable, {
    init: function(e){
        this.__e = e;
    },
    expression: function(){return this.__e;},
    type: function(){return this.__e.type();},
    isReadOnly: function(){return true;},
    idType: function(){return "procedure call " + (this.type() ? "result" : "statement");}
});

var TypeNarrowVariableBase = Class.extend.call(Type.Variable, {
    init: function TypeNarrowVariableBase(){
    }    
});

var TypeNarrowVariable = TypeNarrowVariableBase.extend({
    init: function TypeNarrowVariable(type, isRef, isReadOnly, code){
        this.__type = type;
        this.__isRef = isRef;
        this.__isReadOnly = isReadOnly;
        this.__code = code;
    },
    type: function(){
        return this.__type;
    },
    isReference: function(){
        return this.__isRef;
    },
    code: function(){
        return this.__code;
    },
    referenceCode: function(){
        return this.__code;
    },
    isReadOnly: function(){
        return this.__isReadOnly;
    },
    idType: function(){
        return this.__isReadOnly ? "non-VAR formal parameter"
                                 : TypeNarrowVariableBase.prototype.idType.call(this);
    },
    setType: function(type){
        this.__type = type;
    }
});

var DereferencedTypeNarrowVariable = TypeNarrowVariableBase.extend({
    init: function DereferencedTypeNarrowVariable(v){
        this.__v = v;
    },
    type: function(){
        return this.__v.type();
    },
    isReference: function(){
        return true;
    },
    isReadOnly: function(){
        return false;
    },
    setType: function(type){
        this.__v.setType(type);
    },
    referenceCode: function(){
        return this.__v.code();
    }
});

var InPlaceStringLiteral = TypeNarrowVariable.extend({
    init: function(type){
        TypeNarrowVariable.prototype.init.call(this, type, false, true);
    },
    idType: function(){return "string literal";}
});

var ForEachVariable = TypeNarrowVariable.extend({
    init: function(type){
        TypeNarrowVariable.prototype.init.call(this, type, false, true);
    },
    idType: function(){return "FOR variable";}
});

var Identdef = Class.extend.call(ContextIdentdef.Type, {
    init: function(parent){
        ContextIdentdef.Type.call(this, parent);
        this.__ro = false;
    },
    handleLiteral: function(l){
        if (l == "-")
            this.__ro = true;  
        ContextIdentdef.Type.prototype.handleLiteral.call(this, l);
    },
    doMakeIdendef: function(){
        return new EberonContext.IdentdefInfo(this.id, this.export$, this.__ro);
    }
});

function makeContext(context){
    var l = context.root().language();
    return {
        types: l.types, 
        rtl: function(){return l.rtl();}, 
        qualifyScope: context.qualifyScope.bind(context)
        };
    }

function makeContextCall(context, call){
    return call(makeContext(context));
    }

function OperatorNewMsg(e){
    this.expression = e;
}

function checkMapKeyType(type){
    if (type != EberonString.string() && !Type.isString(type))
        throw new Errors.Error("invalid MAP key type: STRING or string literal or ARRAY OF CHAR expected, got '" + type.description() + "'");            
}

var MapElementVariable = Class.extend.call(Type.Variable, {
    init: function(type, readOnly, code){
        this.__type = type;
        this.__isReadOnly = readOnly;
        this.__code = code;
    },
    type: function(){return this.__type;},
    isReadOnly: function(){return this.__isReadOnly;},
    isReference: function(){return false;},
    referenceCode: function(){
        if (this.__type.isScalar())
            throw new Errors.Error("cannot reference map element of type '" 
                                 + this.__type.description() + "'");
        return this.__code;        
    },
    idType: function(){
        return (this.__isReadOnly ? "read-only " : "") + "MAP's element";
    }
});

var SelfAsPointer = Class.extend.call(Type.Id, {
    init: function(){
    },
    idType: function(){
        return "SELF(POINTER)";
    }
});

var Designator = Class.extend.call(ContextDesignator.Type, {
    init: function EberonContext$Designator(parent){
        ContextDesignator.Type.call(this, parent);
        this.__procCall = undefined;
    },
    doCheckIndexType: function(type){
        if (this.currentType instanceof EberonMap.Type){
            checkMapKeyType(type);
            return;
        }
        return ContextDesignator.Type.prototype.doCheckIndexType.call(this, type);
    },
    doIndexSequence: function(info, code, indexCode){
        var currentType = this.currentType;
        if (currentType == EberonString.string())
            return { length: undefined, 
                     type: Type.basic().ch,
                     info: EberonString.makeElementVariable(),
                     code: this.stringIndexCode(),
                     lval: ""
                   };

        if (currentType instanceof EberonMap.Type){
            var indexType = currentType.valueType;
            var rval = this.root().language().rtl().getMappedValue(code, indexCode);
            return { length: undefined, 
                     type: indexType,
                     info: new MapElementVariable(indexType, info.isReadOnly(), rval),
                     code: rval,
                     lval: code + "[" + indexCode + "]"
                   };
        }
        
        return ContextDesignator.Type.prototype.doIndexSequence.call(this, info, code, indexCode);
    },
    doMakeDerefVar: function(info){
        if (info instanceof TypeNarrowVariable)
            return new DereferencedTypeNarrowVariable(info);
        return ContextDesignator.Type.prototype.doMakeDerefVar.call(this, info);
    },
    handleMessage: function(msg){
        if (msg == Context.beginCallMsg)
            return this.__beginCall();
        if (msg == Context.endCallMsg)
            return this.__endCall();
        if (msg instanceof OperatorNewMsg){
            var e = msg.expression;
            this.advance(e.type(), new ResultVariable(e), e.code(), "");
            return;
        }

        // no type promotion after calling functions
        if (breakTypePromotion(msg))
            return;
        
        return ContextDesignator.Type.prototype.handleMessage.call(this, msg);
    },
    handleExpression: function(e){
        if (this.__procCall)
            this.__procCall.handleArgument(e);
        else
            ContextDesignator.Type.prototype.handleExpression.call(this, e);
    },
    handleLiteral: function(s){
        if (s == "SELF"){
            var type = this.handleMessage(getMethodSelf);
            var info = new Variable.DeclaredVariable("this", type);
            this.advance(type, info, "this", "");
        } 
        else if (s == "POINTER"){
            var typeId = new TypeId.Type(this.handleMessage(getSelfAsPointerMsg));
            var pointerType = new Record.Pointer("", typeId);
            this.advance(pointerType, new SelfAsPointer(), "", "");
        }
        else if (s == "SUPER"){
            var ms = this.handleMessage(getMethodSuper);
            this.advance(ms.info.type, ms.info, ms.code, "");
        }
        else 
            ContextDesignator.Type.prototype.handleLiteral.call(this, s);
    },
    __beginCall: function(){
        var type = this.currentType;
        var info = this.info;
        if (info instanceof TypeId.Type && type instanceof Type.Record){
            this.__procCall = makeContextCall(
                this, 
                function(cx){ return EberonConstructor.makeConstructorCall(info, cx, false); }
                );
            this.discardCode();
        }
        else
            this.__procCall = Context.makeProcCall(this, type, this.info);
    },
    __endCall: function(){
        var e = this.__procCall.end();
        this.advance(e.type(), new ResultVariable(e), e.code(), "");
        this.__procCall = undefined;
    }
});

var OperatorNew = Context.Chained.extend({
    init: function EberonContext$OperatorNew(parent){
        Context.Chained.prototype.init.call(this, parent);
        this.__info = undefined;
        this.__call = undefined;
    },
    handleQIdent: function(q){
        var found = ContextHierarchy.getQIdSymbolAndScope(this.root(), q);
        var s = found.symbol();
        var info = s.info();

        if (!(info instanceof TypeId.Type))
            throw new Errors.Error("record type is expected in operator NEW, got '" + info.idType() + "'");

        var type = info.type();
        if (!(type instanceof Type.Record))
            throw new Errors.Error("record type is expected in operator NEW, got '" + type.description() + "'");
        
        this.__info = info;        
    },
    handleExpression: function(e){
        this.__call.handleArgument(e);
    },
    handleMessage: function(msg){
        if (msg == Context.beginCallMsg){
            this.__call = makeContextCall(
                this,
                function(cx){ return EberonConstructor.makeConstructorCall(this.__info, cx, true); }.bind(this)
                );
            return;
        }
        if (msg == Context.endCallMsg)
            return;

        return Context.Chained.prototype.handleMessage.call(this, msg);
    },
    endParse: function(){
        this.handleMessage(new OperatorNewMsg(this.__call.end()));
    }
});

var InPlaceVariableInit = Context.Chained.extend({
    init: function EberonContext$InPlaceVariableInit(context){
        Context.Chained.prototype.init.call(this, context);
        this.__id = undefined;
        this._symbol = undefined;
        this._code = undefined;
    },
    codeGenerator: function(){return CodeGenerator.nullGenerator();},
    handleIdent: function(id){
        this.__id = id;
    },
    handleLiteral: function(){
        this._code = "var " + this.__id + " = ";
    },
    handleExpression: function(e){
        var type = e.type();
        var isString = Type.isString(type);
        if (!isString && !(type instanceof Type.StorageType))
            throw new Errors.Error("cannot use " + type.description() + " to initialize variable");
        var v = isString ? new InPlaceStringLiteral(type) 
                         : new TypeNarrowVariable(type, false, false, this.__id);
        this._symbol = new Symbol.Symbol(this.__id, v);
        if (type instanceof Type.Record){
            EberonRecord.ensureCanBeInstantiated(this, type, EberonRecord.instantiateForCopy);
            if (e.designator()){
                var l = this.root().language();
                this._code += l.rtl().clone(e.code(), l.types.typeInfo(type));
            }
            else // do not clone if it is temporary, e.g. constructor call
                this._code += e.code();
        }
        else {
            if (type instanceof Type.OpenArray)
                throw new Errors.Error("cannot initialize variable '" + this.__id + "' with open array");
          
            var language = this.root().language();
            var cloneOp;
            language.types.implicitCast(type, type, false, {set: function(v){cloneOp = v;}, get:function(){return cloneOp;}});
            this._code += cloneOp.clone(language, e);
        }
    },
    _onParsed: function(){
        this.parent().codeGenerator().write(this._code);
    },
    endParse: function(){
        if (!this._symbol)
            return false;

        this.root().currentScope().addSymbol(this._symbol);
        this._onParsed();
        return true;
    }
});

var InPlaceVariableInitFor = InPlaceVariableInit.extend({
    init: function EberonContext$InPlaceVariableInitFor(context){
        InPlaceVariableInit.prototype.init.call(this, context);
    },
    _onParsed: function(){
        this.parent().handleInPlaceInit(this._symbol, this._code);
    }
});

var ExpressionProcedureCall = Context.Chained.extend({
    init: function EberonContext$init(context){
        Context.Chained.prototype.init.call(this, context);
    },
    endParse: function(){
        var parent = this.parent();
        var d = this.attributes.designator;
        var info = d.info();
        var e;
        if (info instanceof ResultVariable){
            e = info.expression();
            e = new Expression.Type(d.code(), d.type(), undefined, e.constValue(), e.maxPrecedence());
        }
        else
            e = ContextExpression.designatorAsExpression(d);
        parent.handleExpression(e);
    }
});

var AssignmentOrProcedureCall = Context.Chained.extend({
    init: function EberonContext$init(context){
        Context.Chained.prototype.init.call(this, context);
        this.attributes = {};
        this.__right = undefined;
    },
    handleExpression: function(e){
        this.__right = e;
    },
    codeGenerator: function(){return CodeGenerator.nullGenerator();},
    endParse: function(){
        var d = this.attributes.designator;
        var type = d.type();
        var code;
        if (this.__right){
            var left = Expression.make(d.code(), type, d);
            code = op.assign(left, this.__right, makeContext(this));
        }
        else if (!(d.info() instanceof ResultVariable)){
            var procCall = Context.makeProcCall(this, type, d.info());
            var result = procCall.end();
            Context.assertProcStatementResult(result.type());
            code = d.code() + result.code();
        }
        else{
            Context.assertProcStatementResult(type);
            code = d.code();
        }
    
    this.parent().codeGenerator().write(code);
    }
});

function checkOrdinaryExport(id, hint){
    if (id.isReadOnly())
        throw new Errors.Error(hint + " cannot be exported as read-only using '-' mark (did you mean '*'?)");
}

var ConstDecl = Class.extend.call(ContextConst.Type, {
    init: function EberonContext$ConstDecl(context){
        ContextConst.Type.call(this, context);
    },
    handleIdentdef: function(id){
        checkOrdinaryExport(id, "constant");
        ContextConst.Type.prototype.handleIdentdef.call(this, id);
    }
});

var VariableDeclaration = Class.extend.call(ContextVar.Declaration, {
    init: function EberonContext$VariableDeclaration(context){
        ContextVar.Declaration.call(this, context);
    },
    handleIdentdef: function(id){
        checkOrdinaryExport(id, "variable");
        ContextVar.Declaration.prototype.handleIdentdef.call(this, id);
    },
    doInitCode: function(){
        var type = this.type;
        if (type instanceof EberonRecord.Record)
            EberonRecord.ensureCanBeInstantiated(this, type, EberonRecord.instantiateForVar);
        return ContextVar.Declaration.prototype.doInitCode.call(this);
    }
});

var TypeDeclaration = Class.extend.call(ContextType.Declaration, {
    init: function EberonContext$TypeDeclaration(context){
        ContextType.Declaration.call(this, context);
    },
    handleIdentdef: function(id){
        checkOrdinaryExport(id, "type");
        ContextType.Declaration.prototype.handleIdentdef.call(this, id);
    }
});

var RecordDecl = Class.extend.call(ContextType.Record, {
    init: function EberonContext$RecordDecl(context){
        ContextType.Record.call(this, context, function(name, cons, scope){return new EberonRecord.Record(name, cons, scope); });
    },
    handleMessage: function(msg){
        if (msg instanceof MethodOrProcMsg){
            var methodType = msg.type;
            var boundType = this.type;
            var id = msg.id.id();
            if (Type.typeName(boundType) == id){
                if (msg.id.exported()){
                    var typeId = this.parent().id;
                    if (!typeId.exported())
                        throw new Errors.Error("constructor '" + id + "' cannot be exported because record itslef is not exported");
                }
                boundType.declareConstructor(methodType, msg.id.exported());
            }
            else
                boundType.addMethod(msg.id,
                                    new EberonTypes.MethodType(id, methodType, Procedure.makeProcCallGenerator));
            return;
        }

        if (msg instanceof ContextProcedure.EndParametersMsg) // not used
            return undefined;
        if (msg instanceof ContextProcedure.AddArgumentMsg) // not used
            return undefined;
        return ContextType.Record.prototype.handleMessage.call(this, msg);
    },
    doMakeField: function(field, type){
        return new EberonRecord.Field(field, type, this.type);
    },
    doGenerateBaseConstructorCallCode: function(){
        var base = this.type.base;
        if (!base)
            return "";
        var baseConstructor = EberonRecord.constructor$(base);
        if (!baseConstructor || !baseConstructor.args().length)
            return ContextType.Record.prototype.doGenerateBaseConstructorCallCode.call(this);
        
        return this.qualifiedBaseConstructor() + ".apply(this, arguments);\n";
    },
    endParse: function(){
        var type = this.type;
        if (!type.customConstructor)
            return ContextType.Record.prototype.endParse.call(this);

        this.codeGenerator().write(this.generateInheritance());
        type.setRecordInitializationCode(
            this.doGenerateBaseConstructorCallCode());
    }
});

function breakTypePromotion(msg){
    if (msg instanceof TransferPromotedTypesMsg){
        msg.promotion.clear();
        return true;
    }
    if (msg instanceof PromoteTypeMsg)
        return true;
}

function handleTypePromotionMadeInSeparateStatement(msg){
    if (breakTypePromotion(msg))
        return true;
    if (msg instanceof BeginTypePromotionOrMsg){
        msg.result = new TypePromotion.OrPromotions();
        return true;
    }
    return false;
}

function getConstructorSuperMsg(){}
function getConstructorBoundType(){}

function InitFieldMsg(id){
    this.id = id;
}

var BaseInit = Context.Chained.extend({
    init: function EberonContext$BaseInit(parent){
        Context.Chained.prototype.init.call(this, parent);
        this.__type = undefined;
        this.__initCall = undefined;
        this.__initField = undefined;
    },
    type: function(){
        if (!this.__type)
            this.__type = this.handleMessage(getConstructorBoundType);
        return this.__type;
    },
    codeGenerator: function(){return CodeGenerator.nullGenerator();},
    handleMessage: function(msg){
        if (msg == Context.beginCallMsg)
            return;
        if (msg == Context.endCallMsg){
            var e = this.__initCall.end();
            if (this.__initField)
                this.type().setFieldInitializationCode(this.__initField, e.code());
            else
                this.type().setBaseConstructorCallCode(e.code());
            return;
        }
        return Context.Chained.prototype.handleMessage.call(this, msg);
    },
    handleIdent: function(id){
        this.__initField = id;
        this.__initCall = this.handleMessage(new InitFieldMsg(id));
    },
    handleExpression: function(e){
        this.__initCall.handleArgument(e);
    },
    handleLiteral: function(s){
        if (s == "SUPER"){
            var ms = this.handleMessage(getConstructorSuperMsg);
            this.__initCall = makeContextCall(
                this,
                function(cx){ 
                    return EberonConstructor.makeBaseConstructorCall(
                        this.type().base, 
                        cx);
                    }.bind(this)
                );
        }
    }
});

var ProcOrMethodDecl = Class.extend.call(ContextProcedure.Declaration, {
    init: function EberonContext$ProcOrMethodDecl(parent, stdSymbols){
        ContextProcedure.Declaration.call(this, parent, stdSymbols);
        this.__methodId = undefined;
        this.__methodType = undefined;
        this.__boundType = undefined;
        this.__endingId = undefined;
        this.__isConstructor = false;
        this.__baseConstructorWasCalled = false;
        this.__initedFields = [];
    },
    handleMessage: function(msg){
        if (msg == getMethodSelf){
            if (!this.__boundType)
                throw new Errors.Error("SELF can be used only in methods");
            return this.__boundType;
        }
        if (msg == getSelfAsPointerMsg){
            this.__boundType.requireNewOnly();
            return this.__boundType;
        }

        if (msg == getConstructorBoundType)
            return this.__boundType;

        if (msg == getConstructorSuperMsg){
            this.__baseConstructorWasCalled = true;
            return this.__handleSuperCall();
        }

        if (msg == getMethodSuper){
            if (this.__isConstructor)
                throw new Errors.Error("cannot call base constructor from procedure body (use '| SUPER' to pass parameters to base constructor)");
            return this.__handleSuperCall();
        }

        if (msg instanceof InitFieldMsg)
            return this.__handleFieldInit(msg.id);

        if (msg instanceof MethodOrProcMsg){
            var id = msg.id;
            var type = msg.type;
            if (type){
                this.__methodId = id;
                this.__boundType = type;
                var name = Type.typeName(type);
                this.__isConstructor = name == id.id();
            }

            ContextProcedure.Declaration.prototype.handleIdentdef.call(this, id);
            return;
        }

        if (handleTypePromotionMadeInSeparateStatement(msg))
            return;

        return ContextProcedure.Declaration.prototype.handleMessage.call(this, msg);
    },
    doProlog: function(){
        return this.__boundType
            ? this.__isConstructor ? "function " + Type.typeName(this.__boundType) + "("
                                   : Type.typeName(this.__boundType) + ".prototype." + this.__methodId.id() + " = function("
            : ContextProcedure.Declaration.prototype.doProlog.call(this);
    },
    doEpilog: function(){
        return this.__boundType && !this.__isConstructor
            ? ";\n"
            : ContextProcedure.Declaration.prototype.doEpilog.call(this);
    },
    doBeginBody: function(){
        ContextProcedure.Declaration.prototype.doBeginBody.call(this);
        if (this.__isConstructor)
            this.codeGenerator().write(
                this.__boundType.baseConstructorCallCode
              + EberonRecord.fieldsInitializationCode(this.__boundType, this));
    },
    doMakeArgumentVariable: function(arg, name){
        if (!arg.isVar)
            return new TypeNarrowVariable(arg.type, false, true, name);

        if (arg.type instanceof Type.Record)
            return new TypeNarrowVariable(arg.type, true, false, name);

        return ContextProcedure.Declaration.prototype.doMakeArgumentVariable.call(this, arg, name);
    },
    setType: function(type){
        if (this.__methodId){
            this.__methodType = new EberonTypes.MethodType(this.__methodId.id(), type, Procedure.makeProcCallGenerator);
            this.type = type;
            }            
        else
            ContextProcedure.Declaration.prototype.setType.call(this, type);
    },
    handleIdent: function(id){
        if (!this.__boundType)
            ContextProcedure.Declaration.prototype.handleIdent.call(this, id);
        else if (this.__endingId)
            this.__endingId = this.__endingId + "." + id;
        else
            this.__endingId = id;
    },
    endParse: function(){
        ContextProcedure.Declaration.prototype.endParse.call(this);

        if (this.__boundType){
            if (this.__endingId){
                var expected = Type.typeName(this.__boundType) + "." + this.id.id();
                if (this.__endingId != expected)
                    throw new Errors.Error(
                          "mismatched method names: expected '" 
                        + expected
                        + "' at the end (or nothing), got '" 
                        + this.__endingId + "'");
            }

            if (this.__isConstructor){
                this.__boundType.defineConstructor(this.__methodType.procType());

                var base = this.__boundType.base;
                var baseConstructor = base && EberonRecord.constructor$(base);
                if (!this.__baseConstructorWasCalled && baseConstructor && baseConstructor.args().length)
                    throw new Errors.Error("base record constructor has parameters but was not called (use '| SUPER' to pass parameters to base constructor)");
                if (this.__baseConstructorWasCalled && (!baseConstructor || !baseConstructor.args().length))
                    throw new Errors.Error("base record constructor has no parameters and will be called automatically (do not use '| SUPER' to call base constructor)");
            }
            else
                this.__boundType.defineMethod(this.__methodId, this.__methodType);
        }
    },
    __handleSuperCall: function(){
        if (!this.__methodId)
            throw new Errors.Error("SUPER can be used only in methods");

        var baseType = this.__boundType.base;
        if (!baseType)
            throw new Errors.Error(
                  "'" + Type.typeName(this.__boundType)
                + "' has no base type - SUPER cannot be used");

        var id = this.__methodId.id();
        if (!this.__isConstructor)
            EberonRecord.requireMethodDefinition(baseType, id, "cannot use abstract method(s) in SUPER calls");
        
        return {
            info: this.__isConstructor ? undefined
                                       : new Type.ProcedureId(new EberonTypes.MethodType(id, this.__methodType.procType(), superMethodCallGenerator)),
            code: this.qualifyScope(baseType.scope)
                + Type.typeName(baseType) + ".prototype." + id + ".call"
        };
    },
    __handleFieldInit: function(id){
        var fields = this.__boundType.fields;
        if (!fields.hasOwnProperty(id))
            throw new Errors.Error("'" + id + "' is not record '" + Type.typeName(this.__boundType) + "' own field");
        
        if (this.__initedFields.indexOf(id) != -1)
            throw new Errors.Error("field '" + id + "' is already initialized");

        this.__initedFields.push(id);        
        var type = fields[id].type();
        return makeContextCall(
            this, 
            function(cx){return EberonConstructor.makeFieldInitCall(type, cx, id);});
    }
});

var Factor = Class.extend.call(ContextExpression.Factor, {
    init: function EberonContext$Factor(context){
        ContextExpression.Factor.call(this, context);
    },
    handleLogicalNot: function(){
        ContextExpression.Factor.prototype.handleLogicalNot.call(this);
        var p = this.getCurrentPromotion();
        if (p)
            p.invert();
    },
    getCurrentPromotion: function(){
        return this.parent().getCurrentPromotion();
    }
});

var AddOperator = Class.extend.call(ContextExpression.AddOperator, {
    init: function EberonContext$AddOperator(context){
        ContextExpression.AddOperator.call(this, context);
    },
    doMatchPlusOperator: function(type){
        if (type == EberonString.string() || type instanceof Type.String)
            return eOp.addStr;
        return ContextExpression.AddOperator.prototype.doMatchPlusOperator.call(this, type);
    },
    doExpectPlusOperator: function(){return "numeric type or SET or STRING";},
    endParse: function(){
        this.parent().handleLogicalOr();
    }
});

var MulOperator = Class.extend.call(ContextExpression.MulOperator, {
    init: function EberonContext$MulOperator(context){
        ContextExpression.MulOperator.call(this, context);
    },
    endParse: function(s){
        this.parent().handleLogicalAnd();
    }
});

function PromoteTypeMsg(info, type){
    this.info = info;
    this.type = type;
}

function TransferPromotedTypesMsg(promotion){
    this.promotion = promotion;
}

var RelationOps = Class.extend.call(ContextExpression.RelationOps, {
    init: function EberonContext$RelationOps(){
        ContextExpression.RelationOps.call(this);
    },
    eq: function(type){
        return type == EberonString.string() 
            ? eOp.equalStr
            : ContextExpression.RelationOps.prototype.eq.call(this, type);
    },
    notEq: function(type){
        return type == EberonString.string() 
            ? eOp.notEqualStr
            : ContextExpression.RelationOps.prototype.notEq.call(this, type);
    },
    less: function(type){
        return type == EberonString.string() 
            ? eOp.lessStr
            : ContextExpression.RelationOps.prototype.less.call(this, type);
    },
    greater: function(type){
        return type == EberonString.string() 
            ? eOp.greaterStr
            : ContextExpression.RelationOps.prototype.greater.call(this, type);
    },
    lessEq: function(type){
        return type == EberonString.string() 
            ? eOp.lessEqualStr
            : ContextExpression.RelationOps.prototype.lessEq.call(this, type);
    },
    greaterEq: function(type){
        return type == EberonString.string() 
            ? eOp.greaterEqualStr
            : ContextExpression.RelationOps.prototype.greaterEq.call(this, type);
    },
    is: function(context){
        var impl = ContextExpression.RelationOps.prototype.is.call(this, context);
        return function(left, right){
            var d = left.designator();
            if (d){
                var v = d.info();
                if (v instanceof TypeNarrowVariableBase)
                    context.handleMessage(new PromoteTypeMsg(v, ContextExpression.unwrapType(right.designator().info())));
            }
            return impl(left, right);
        };
    },
    coalesceType: function(leftType, rightType){
        if ((leftType == EberonString.string() && rightType instanceof Type.String)
            || (rightType == EberonString.string() && leftType instanceof Type.String))
            return EberonString.string();
        return ContextExpression.RelationOps.prototype.coalesceType.call(this, leftType, rightType);
    }
});

function BeginTypePromotionAndMsg(){
    this.result = undefined;
}

function BeginTypePromotionOrMsg(){
    this.result = undefined;
}

var Term = Class.extend.call(ContextExpression.Term, {
    init: function EberonContext$Term(context){
        ContextExpression.Term.call(this, context);
        this.__typePromotion = undefined;
        this.__currentPromotion = undefined;
        this.__andHandled = false;
    },
    handleMessage: function(msg){
        if (msg instanceof PromoteTypeMsg) {
            var promoted = msg.info;
            var p = this.getCurrentPromotion();
            if (p)
                p.promote(promoted, msg.type);
            return;
        }
        if (msg instanceof BeginTypePromotionOrMsg){
            var cp = this.getCurrentPromotion();
            if (cp)
                msg.result = cp.makeOr();
            return;
        }
        return ContextExpression.Term.prototype.handleMessage.call(this, msg);
    },
    handleLogicalAnd: function(){
        if (this.__typePromotion)
            this.__currentPromotion = this.__typePromotion.next();
        else
            this.__andHandled = true;
    },
    getCurrentPromotion: function(){
        if (!this.__currentPromotion){
            var msg = new BeginTypePromotionAndMsg();
            this.parent().handleMessage(msg);
            this.__typePromotion = msg.result;
            if (this.__typePromotion){
                if (this.__andHandled)
                    this.__typePromotion.next();
                this.__currentPromotion = this.__typePromotion.next();
            }
        }
        return this.__currentPromotion;
    }
});

var SimpleExpression = Class.extend.call(ContextExpression.SimpleExpression, {
    init: function EberonContext$SimpleExpression(context){
        ContextExpression.SimpleExpression.call(this, context);
        this.__typePromotion = undefined;
        this.__currentTypePromotion = undefined;
        this.__orHandled = false;
    },
    handleLogicalOr: function(){
        if (this.__typePromotion)
            this.__currentPromotion = this.__typePromotion.next();
        else
            this.__orHandled = true;
    },
    handleMessage: function(msg){
        if (msg instanceof BeginTypePromotionAndMsg){
            var p = this.__getCurrentPromotion();
            if (p)
                msg.result = p.makeAnd();
            return;
        }
        return ContextExpression.SimpleExpression.prototype.handleMessage.call(this, msg);
    },
    endParse: function(){
        if (this.__typePromotion)
            this.parent().handleTypePromotion(this.__typePromotion);
        ContextExpression.SimpleExpression.prototype.endParse.call(this);
    },
    __getCurrentPromotion: function(){
        if (!this.__currentPromotion){
            var msg = new BeginTypePromotionOrMsg();
            this.parent().handleMessage(msg);
            this.__typePromotion = msg.result;
            if (this.__typePromotion){
                if (this.__orHandled)
                    this.__typePromotion.next();
                this.__currentPromotion = this.__typePromotion.next();
            }
        }
        return this.__currentPromotion;
    }
});

var relationOps = new RelationOps();

var ExpressionContext = Class.extend.call(ContextExpression.ExpressionNode, {
    init: function EberonContext$Expression(context){
        ContextExpression.ExpressionNode.call(this, context, relationOps);
        this.__typePromotion = undefined;
        this.__currentTypePromotion = undefined;
    },
    handleMessage: function(msg){
        if (msg instanceof TransferPromotedTypesMsg)
            return;
        return ContextExpression.ExpressionNode.prototype.handleMessage.call(this, msg);
    },
    handleTypePromotion: function(t){
        this.__currentTypePromotion = t;
    },
    handleLiteral: function(s){
        if (this.__currentTypePromotion){
            this.__currentTypePromotion.clear();
        }
        ContextExpression.ExpressionNode.prototype.handleLiteral.call(this, s);
    },
    endParse: function(){
        if (this.__currentTypePromotion)
            this.parent().handleMessage(new TransferPromotedTypesMsg(this.__currentTypePromotion));
        return ContextExpression.ExpressionNode.prototype.endParse.call(this);
    },
    doRelationOperation: function(left, right, relation){
        if (relation == "IN" && right.type() instanceof EberonMap.Type){
            checkMapKeyType(left.type());
            return eOp.inMap;            
        }
        return ContextExpression.ExpressionNode.prototype.doRelationOperation.call(this, left, right, relation);
    }
});

var OperatorScopes = Class.extend({
    init: function EberonContext$OperatorScopes(context){
        this.__context = context;
        this.__scope = undefined;

        this.__typePromotion = undefined;
        this.__typePromotions = [];
        this.__ignorePromotions = false;
        this.alternate();
    },
    handleMessage: function(msg){
        if (this.__ignorePromotions)
            return false;
        if (msg instanceof TransferPromotedTypesMsg)
            return true;
        if (msg instanceof PromoteTypeMsg){
            this.__typePromotion = new TypePromotion.Promotion(msg.info, msg.type);
            this.__typePromotions.push(this.__typePromotion);
            return true;
        }
        if (msg instanceof BeginTypePromotionOrMsg){
            this.__typePromotion = new TypePromotion.OrPromotions();
            this.__typePromotions.push(this.__typePromotion);
            msg.result = this.__typePromotion;
            return true;
        }
        return false;
    },
    doThen: function(){
        if (this.__typePromotion)
            this.__typePromotion.and();
        this.__ignorePromotions = true;
    },
    alternate: function(){
        var root = this.__context.root();
        if (this.__scope)
            root.popScope();
        this.__scope = EberonScope.makeOperator(
            root.currentScope(),
            root.language().stdSymbols);
        root.pushScope(this.__scope);

        if (this.__typePromotion){
            this.__typePromotion.reset();
            this.__typePromotion.or();
            this.__typePromotion = undefined;
        }
        this.__ignorePromotions = false;
    },
    reset: function(){
        this.__context.root().popScope();
        for(var i = 0; i < this.__typePromotions.length; ++i){
            this.__typePromotions[i].reset();
        }
    }
});

var While = Class.extend.call(ContextLoop.While, {
    init: function EberonContext$While(context){
        ContextLoop.While.call(this, context);
        this.__scopes = new OperatorScopes(this);
    },
    handleLiteral: function(s){
        ContextLoop.While.prototype.handleLiteral.call(this, s);
        if (s == "DO")
            this.__scopes.doThen();
        else if (s == "ELSIF")
            this.__scopes.alternate();
    },
    handleMessage: function(msg){
        if (this.__scopes.handleMessage(msg))
            return;

        return ContextLoop.While.prototype.handleMessage.call(this, msg);
    },
    endParse: function(){
        this.__scopes.reset();
        ContextLoop.While.prototype.endParse.call(this);
    }
});

var If = Class.extend.call(ContextIf.Type, {
    init: function EberonContext$If(context){
        ContextIf.Type.call(this, context);
        this.__scopes = new OperatorScopes(this);
    },
    handleMessage: function(msg){
        if (this.__scopes.handleMessage(msg))
            return;

        return ContextIf.Type.prototype.handleMessage.call(this, msg);
    },
    handleLiteral: function(s){
        ContextIf.Type.prototype.handleLiteral.call(this, s);
        if (s == "THEN")
            this.__scopes.doThen();
        else if (s == "ELSIF" || s == "ELSE")
            this.__scopes.alternate();
    },
    endParse: function(){
        this.__scopes.reset();
        ContextIf.Type.prototype.endParse.call(this);
    }
});

var CaseLabel = Class.extend.call(ContextCase.Label, {
    init: function EberonContext$CaseLabel(context){
        ContextCase.Label.call(this, context);
    },
    handleLiteral: function(s){
        if (s == ':'){ // statement sequence is expected now
            var root = this.root();
            var scope = EberonScope.makeOperator(
                root.currentScope(),
                root.language().stdSymbols);
            root.pushScope(scope);
        }
    },
    endParse: function(){
        this.root().popScope();
        ContextCase.Label.prototype.endParse.call(this);
    }
});

var Repeat = Class.extend.call(ContextLoop.Repeat, {
    init: function EberonContext$Repeat(context){
        ContextLoop.Repeat.call(this, context);
        var root = this.root();
        var scope = EberonScope.makeOperator(
            root.currentScope(),
            root.language().stdSymbols);
        root.pushScope(scope);
    },
    endParse: function(){
        this.root().popScope();
        //Context.Repeat.prototype.endParse.call(this);
    }
});

var For = Class.extend.call(ContextLoop.For, {
    init: function EberonContext$Repeat(context){
        ContextLoop.For.call(this, context);
        var root = this.root();
        var scope = EberonScope.makeOperator(
            root.currentScope(),
            root.language().stdSymbols);
        root.pushScope(scope);
    },
    handleInPlaceInit: function(symbol, code){
        this.doHandleInitCode(symbol.id(), "for (" + code);
        this.doHandleInitExpression(symbol.info().type());
    },
    endParse: function(){
        this.root().popScope();
        ContextLoop.For.prototype.endParse.call(this);
    }
});

var dynamicArrayLength = -1;

var ArrayDimensions = Class.extend.call(ContextType.ArrayDimensions, {
    init: function EberonContext$ArrayDimensions(context){
        ContextType.ArrayDimensions.call(this, context);
    },
    handleLiteral: function(s){
        if ( s == "*" )
            this.doAddDimension(dynamicArrayLength);
        else
            ContextType.ArrayDimensions.prototype.handleLiteral.call(this, s);
    }
});

var MapDecl = Context.Chained.extend({
    init: function EberonContext$MapDecl(context){
        Context.Chained.prototype.init.call(this, context);
        this.__type = undefined;
    },
    handleQIdent: function(q){
        var s = ContextHierarchy.getQIdSymbolAndScope(this.root(), q);
        var type = ContextExpression.unwrapType(s.symbol().info());
        this.setType(type);
    },
    // anonymous types can be used in map declaration
    setType: function(type){
        this.__type = type;
    },
    isAnonymousDeclaration: function(){return true;},
    typeName: function(){return "";},
    endParse: function(){
        this.parent().setType(new EberonMap.Type(this.__type));
    }
});

var ForEach = Context.Chained.extend({
    init: function EberonContext$MapDecl(context){
        Context.Chained.prototype.init.call(this, context);
        this.__valueId = undefined;
        this.__keyId = undefined;
        this.__scopeWasCreated = false;
        this.__codeGenerator = CodeGenerator.nullGenerator();
    },
    handleIdent: function(id){
        if (!this.__keyId)
                this.__keyId = id;
            else
                this.__valueId = id;
    },
    codeGenerator: function(){return this.__codeGenerator;},
    handleExpression: function(e){
        var type = e.type();
        if (!(type instanceof EberonMap.Type))
            throw new Errors.Error("expression of type MAP is expected in FOR, got '" 
                                 + type.description() + "'");

        var root = this.root();
        var scope = EberonScope.makeOperator(
            root.currentScope(),
            root.language().stdSymbols);
        root.pushScope(scope);
        this.__scopeWasCreated = true;

        var code = this.parent().codeGenerator();
        var mapVar = root.currentScope().generateTempVar("map");
        code.write("var " + mapVar + " = " + e.code() + ";\n");
        code.write("for(var " + this.__keyId + " in " + mapVar + ")");
        code.openScope();
        code.write("var " + this.__valueId + " = " + mapVar + "[" + this.__keyId + "];\n");
        this.__codeGenerator = code;

        this.__makeVariable(this.__keyId, EberonString.string(), scope);
        this.__makeVariable(this.__valueId, type.valueType, scope);
    },
    endParse: function(){
        this.__codeGenerator.closeScope("");
        if (this.__scopeWasCreated)
            this.root().popScope();
    },
    __makeVariable: function(id, type, scope){
        var v = new ForEachVariable(type);
        var s = new Symbol.Symbol(id, v);
        scope.addSymbol(s);
        return s;
    }
});

var ArrayDecl = Class.extend.call(ContextType.Array, {
    init: function EberonContext$ArrayDecl(context){
        ContextType.Array.call(this, context);
    },
    doMakeInit: function(type, dimensions, length){
        if (length == dynamicArrayLength)
            return '[]';

        if (type instanceof EberonRecord.Record && EberonRecord.hasParameterizedConstructor(type))
            throw new Errors.Error("cannot use '" + Type.typeName(type) + "' as an element of static array because it has constructor with parameters");

        return ContextType.Array.prototype.doMakeInit.call(this, type, dimensions, length);
    },
    doMakeType: function(elementsType, init, length){
        return length == dynamicArrayLength
            ? new EberonDynamicArray.DynamicArray(elementsType)
            : ContextType.Array.prototype.doMakeType.call(this, elementsType, init, length);
    }
});

function assertArgumentIsNotNonVarDynamicArray(msg){
    if (msg instanceof ContextProcedure.AddArgumentMsg){
        var arg = msg.arg;
        if (!arg.isVar){
            var type = arg.type;
            while (type instanceof Type.Array){
                if (type instanceof EberonDynamicArray.DynamicArray)
                    throw new Errors.Error("dynamic array has no use as non-VAR argument '" + msg.name + "'");
                type = type.elementsType;
            }
        }
    }
}

var FormalParameters = Class.extend.call(ContextProcedure.FormalParameters, {
    init: function EberonContext$FormalParameters(context){
        ContextProcedure.FormalParameters.call(this, context);
    },
    handleMessage: function(msg){
        assertArgumentIsNotNonVarDynamicArray(msg);
        return ContextProcedure.FormalParameters.prototype.handleMessage.call(this, msg);
    },
    doCheckResultType: function(type){
        if (type instanceof EberonDynamicArray.DynamicArray)
            return;
        ContextProcedure.FormalParameters.prototype.doCheckResultType.call(this, type);
    }
});

var FormalType = Context.HandleSymbolAsType.extend({
    init: function EberonContext$FormalType(context){
        Context.HandleSymbolAsType.prototype.init.call(this, context);
        this.__arrayDimensions = [];
        this.__dynamicDimension = false;
    },
    setType: function(type){           
        function makeDynamic(type){return new EberonDynamicArray.DynamicArray(type); }

        for(var i = this.__arrayDimensions.length; i--;){
            var cons = this.__arrayDimensions[i]
                ? makeDynamic
                : this.root().language().types.makeOpenArray;
            type = cons(type);
        }
        this.parent().setType(type);
    },
    handleLiteral: function(s){
        if (s == "*")
            this.__dynamicDimension = true;
        else if ( s == "OF"){
            this.__arrayDimensions.push(this.__dynamicDimension);
            this.__dynamicDimension = false;
        }
    }
});

var FormalParametersProcDecl = Class.extend.call(ContextProcedure.FormalParametersProcDecl, {
    init: function EberonContext$FormalParametersProcDecl(context){
        ContextProcedure.FormalParametersProcDecl.call(this, context);
    },
    handleMessage: function(msg){
        assertArgumentIsNotNonVarDynamicArray(msg);
        return ContextProcedure.FormalParametersProcDecl.prototype.handleMessage.call(this, msg);
    },
    doCheckResultType: function(type){
        if (type instanceof EberonDynamicArray.DynamicArray)
            return;
        ContextProcedure.FormalParametersProcDecl.prototype.doCheckResultType.call(this, type);
    }
});

var ModuleDeclaration = Context.ModuleDeclaration.extend({
    init: function EberonContext$ModuleDeclaration(context){
        Context.ModuleDeclaration.prototype.init.call(this, context);
    },
    handleMessage: function(msg){
        if (handleTypePromotionMadeInSeparateStatement(msg))
            return;
        return Context.ModuleDeclaration.prototype.handleMessage.call(this, msg);
    }
});

exports.AddOperator = AddOperator;
exports.ArrayDecl = ArrayDecl;
exports.ArrayDimensions = ArrayDimensions;
exports.BaseInit = BaseInit;
exports.CaseLabel = CaseLabel;
exports.ConstDecl = ConstDecl;
exports.Designator = Designator;
exports.Expression = ExpressionContext;
exports.ExpressionProcedureCall = ExpressionProcedureCall;
exports.For = For;
exports.ForEach = ForEach;
exports.FormalParameters = FormalParameters;
exports.FormalParametersProcDecl = FormalParametersProcDecl;
exports.FormalType = FormalType;
exports.Identdef = Identdef;
exports.If = If;
exports.MethodHeading = MethodHeading;
exports.ModuleDeclaration = ModuleDeclaration;
exports.MulOperator = MulOperator;
exports.AssignmentOrProcedureCall = AssignmentOrProcedureCall;
exports.Factor = Factor;
exports.MapDecl = MapDecl;
exports.ProcOrMethodId = ProcOrMethodId;
exports.ProcOrMethodDecl = ProcOrMethodDecl;
exports.RecordDecl = RecordDecl;
exports.Repeat = Repeat;
exports.SimpleExpression = SimpleExpression;
exports.InPlaceVariableInit = InPlaceVariableInit;
exports.InPlaceVariableInitFor = InPlaceVariableInitFor;
exports.OperatorNew = OperatorNew;
exports.Term = Term;
exports.TypeDeclaration = TypeDeclaration;
exports.VariableDeclaration = VariableDeclaration;
exports.While = While;
