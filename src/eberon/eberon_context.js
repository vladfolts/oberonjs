"use strict";

var Cast = require("js/Cast.js");
var Class = require("rtl.js").Class;
var Code = require("js/Code.js");
var Context = require("context.js");
var EberonScope = require("js/EberonScope.js");
var EberonString = require("js/EberonString.js");
var Errors = require("js/Errors.js");
var op = require("js/Operator.js");
var eOp = require("js/EberonOperator.js");
var Symbol = require("js/Symbols.js");
var Procedure = require("js/Procedure.js");
var Type = require("js/Types.js");

/*
function log(s){
    console.info(s);
}
*/
function methodCallGenerator(context, id, type){
    return new Procedure.makeProcCallGenerator(context, id, type);
}

function superMethodCallGenerator(context, id, type){
    var args = Procedure.makeArgumentsCode(context);
    args.write(Code.makeExpression("this"));
    return Procedure.makeProcCallGeneratorWithCustomArgs(context, id, type, args);
}

function resetPromotedTypes(types){
    //log("reset promoted: " + types.length);
    for(var i = 0; i < types.length; ++i){
        var info = types[i];
        //log("\t" + info.type.type().name + "->" + info.restore.name);
        info.type.resetPromotion(info.restore);
    }
}

var MethodType = Type.Procedure.extend({
    init: function EberonContext$MethodType(id, type, callGenerator){
        Type.Procedure.prototype.init.call(this);
        this.__id = id;
        this.__type = type;
        this.__callGenerator = callGenerator;
    },
    procType: function(){return this.__type;},
    args: function(){return this.__type.args();},
    result: function(){return this.__type.result();},
    description: function(){return "method " + this.__id;},
    procDescription: function(){return this.__type.description();},
    callGenerator: function(context, id){return this.__callGenerator(context, id, this);}
});

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
        var ss = Context.getSymbolAndScope(this, this.__maybeTypeId);
        var type = Context.unwrapType(ss.symbol().info());
        if (!(type instanceof Type.Record))
            throw new Errors.Error(
                  "RECORD type expected in method declaration, got '"
                + type.description() + "'");
        if (ss.scope() != this.currentScope())
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
    typeName: function(){return undefined;},
    setType: function(type){this.__type = type;},
    endParse: function(){
        this.handleMessage(new MethodOrProcMsg(this.__id, this.__type));
    }
});

function getMethodSelf(){}
function getSelfAsPointerMsg(){}
function getMethodSuper(){}

var MethodVariable = Type.Variable.extend({
    init: function(type){
        this.__type = type;
    },
    type: function(){return this.__type;},
    isReadOnly: function(){return true;},
    idType: function(){return "method";}
});

var ResultVariable = Type.Variable.extend({
    init: function(e){
        this.__e = e;
    },
    expression: function(){return this.__e;},
    type: function(){return this.__e.type();},
    isReadOnly: function(){return true;},
    idType: function(){return "procedure call " + (this.type() ? "result" : "statement");}
});

var TypeNarrowVariable = Type.Variable.extend({
    init: function TypeNarrowVariable(type, isRef, isReadOnly){
        this.__type = type;
        this.__invertedType = this.__type;
        this.__isRef = isRef;
        this.__isReadOnly = isReadOnly;
    },
    type: function(){
        return this.__type;
    },
    isReference: function(){
        return this.__isRef;
    },
    isReadOnly: function(){
        return this.__isReadOnly;
    },
    idType: function(){
        return this.__isReadOnly ? "non-VAR formal parameter"
                                 : Type.Variable.prototype.idType.call(this);
    },
    promoteType: function(t){
        var result = this.__type;
        this.__type = t;
        return result;
    },
    invertType: function(){
        var type = this.__type;
        this.__type = this.__invertedType;
        this.__invertedType = type;
    },
    resetPromotion: function(type){
        this.__type = type;
    }
});

var InPlaceStringLiteral = TypeNarrowVariable.extend({
    init: function(type){
        TypeNarrowVariable.prototype.init.call(this, type, false, true);
    },
    idType: function(){return "string literal";}
});

var IdentdefInfo = Context.IdentdefInfo.extend({
    init: function(id, exported, ro){
        Context.IdentdefInfo.prototype.init.call(this, id, exported);
        this.__ro = ro;
    },
    isReadOnly: function(){return this.__ro;}
});

var Identdef = Context.Identdef.extend({
    init: function(parent){
        Context.Identdef.prototype.init.call(this, parent);
        this.__ro = false;
    },
    handleLiteral: function(l){
        if (l == "-")
            this.__ro = true;  
        Context.Identdef.prototype.handleLiteral.call(this, l);
    },
    _makeIdendef: function(){
        return new IdentdefInfo(this._id, this._export, this.__ro);
    }
});

var Designator = Context.Designator.extend({
    init: function EberonContext$Designator(parent){
        Context.Designator.prototype.init.call(this, parent);
        this.__procCall = undefined;
    },
    _indexSequence: function(type, info){
        if (type == EberonString.string()){
            var indexType = Type.basic().ch;
            return { length: undefined, 
                     type: indexType,
                     info: EberonString.makeElementVariable(indexType)
                   };
        }
        return Context.Designator.prototype._indexSequence.call(this, type, info);
    },
    _makeDenoteVar: function(field, isReadOnly){
        var type = field.type();
        if (type instanceof MethodType)
            return new MethodVariable(type);
        if (!isReadOnly && this.qualifyScope(Type.recordScope(field.recordType())))
            isReadOnly = field.identdef().isReadOnly();
        return Context.Designator.prototype._makeDenoteVar(field, isReadOnly);
    },
    handleMessage: function(msg){
        if (msg == Context.beginCallMsg)
            return this.__beginCall();
        if (msg == Context.endCallMsg)
            return this.__endCall();
        
        return Context.Designator.prototype.handleMessage.call(this, msg);
    },
    handleExpression: function(e){
        if (this.__procCall)
            this.__procCall.handleArgument(e);
        else
            Context.Designator.prototype.handleExpression.call(this, e);
    },
    handleLiteral: function(s){
        if (s == "SELF"){
            var type = this.handleMessage(getMethodSelf);
            this._advance(type, type, "this");
        } 
        else if (s == "POINTER"){
            var typeId = Type.makeTypeId(this.handleMessage(getSelfAsPointerMsg));
            var pointerType = Type.makePointer("", typeId);
            var info = Type.makeVariable(pointerType, true);
            this._advance(pointerType, info, "this");
        }
        else if (s == "SUPER"){
            var ms = this.handleMessage(getMethodSuper);
            this._advance(ms.info.type, ms.info, ms.code);
        }
        else 
            Context.Designator.prototype.handleLiteral.call(this, s);
    },
    __beginCall: function(){
        this.__procCall = Context.makeProcCall(this, this.__currentType, this.__info, this.__code);
    },
    __endCall: function(){
        var e = this.__procCall.end();
        this._advance(e.type(), new ResultVariable(e), e.code());
        this.__procCall = undefined;
    }
});

var InPlaceVariableInit = Context.Chained.extend({
    init: function EberonContext$InPlaceVariableInit(context){
        Context.Chained.prototype.init.call(this, context);
        this.__id = undefined;
        this._symbol = undefined;
        this._code = undefined;
    },
    codeGenerator: function(){return Code.nullGenerator();},
    handleIdent: function(id){
        this.__id = id;
    },
    handleLiteral: function(){
        this._code = "var " + this.__id + " = ";
    },
    handleExpression: function(e){
        var type = e.type();
        var v = Type.isString(type) ? new InPlaceStringLiteral(type) 
                                    : new TypeNarrowVariable(type, false, false);
        this._symbol = Symbol.makeSymbol(this.__id, v);
        if (type instanceof Type.Record)
            this._code += this.language().rtl.clone(e.code());
        else if (type instanceof Type.Array){
            if (Type.arrayLength(type) == Type.openArrayLength)
                throw new Errors.Error("cannot initialize variable '" + this.__id + "' with open array");
            this._code += this.language().rtl.clone(e.code());
        }
        else
            this._code += Code.derefExpression(e).code();
    },
    _onParsed: function(){
        this.parent().codeGenerator().write(this._code);
    },
    endParse: function(){
        if (!this._symbol)
            return false;

        this.currentScope().addSymbol(this._symbol);
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
        this.__typePromotion = new TypePromotionHandler();
    },
    setDesignator: function(d){
        var info = d.info();
        var parent = this.parent();
        if (info instanceof ResultVariable)
            parent.handleExpression(info.expression());
        else
            parent.setDesignator(d);
    },
    handleMessage: function(msg){
        if (this.__typePromotion.handleMessage(msg))
            return;

        return Context.Chained.prototype.handleMessage.call(this, msg);
    },
    endParse: function(){
        this.__typePromotion.reset();
    }
});

var AssignmentOrProcedureCall = Context.Chained.extend({
    init: function EberonContext$init(context){
        Context.Chained.prototype.init.call(this, context);
        this.__left = undefined;
        this.__right = undefined;
    },
    setDesignator: function(d){
        this.__left = d;
    },
    handleExpression: function(e){
        this.__right = e;
    },
    codeGenerator: function(){return Code.nullGenerator();},
    endParse: function(){
        var d = this.__left;
        var code;
        if (this.__right){
            var left = Code.makeExpression(d.code(), d.type(), d);
            code = op.assign(left, this.__right, this.language());
        }
        else if (!(d.info() instanceof ResultVariable)){
            var procCall = Context.makeProcCall(this, d.type(), d.info(), d.code());
            var result = procCall.end();
            Context.assertProcStatementResult(result.type());
            code = result.code();
        }
        else{
            Context.assertProcStatementResult(d.type());
            code = d.code();
        }
    
    this.parent().codeGenerator().write(code);
    }
});

var RecordType = Type.Record.extend({
    init: function EberonContext$RecordType(name, cons, scope){
        Type.Record.prototype.init.call(this);
        Type.initRecord(this, name, cons, scope);
        this.__finalized = false;
        this.__declaredMethods = {};
        this.__definedMethods = [];
        this.__abstractMethods = [];
        this.__instantiated = false;
        this.__createByNewOnly = false;
        this.__declaredAsVariable = false;
        this.__lazyDefinitions = {};
        this.__nonExportedMethods = [];
    },
    initializer: function(context, forNew){
        if (this.__finalized){
            this.__ensureNonAbstract();
            if (!forNew)
                this.__ensureVariableCanBeDeclared();
        }
        else {
            this.__instantiated = true;
            if (!forNew)
                this.__declaredAsVariable = true;
        }

        return Type.Record.prototype.initializer.call(this, context);
    },
    findSymbol: function(id){
        var result = this.__hasMethodDeclaration(id);
        if (!result)
            result = Type.Record.prototype.findSymbol.call(this, id);
        return result;
    },
    addField: function(field, type){
        var id = field.id();
        if (this.__hasMethodDeclaration(id))
            throw new Errors.Error(
                "cannot declare field, record already has method '" + id +"'");
        return Type.Record.prototype.addField.call(this, field, type);
    },
    addMethod: function(methodId, type){
        var id = methodId.id();
        var existingField = this.findSymbol(id);
        if (existingField)
            throw new Errors.Error(
                  existingField.type() instanceof MethodType
                ?   "cannot declare a new method '" + id 
                  + "': method already was declared"
                : "cannot declare method, record already has field '" + id + "'");

        this.__declaredMethods[id] = new Context.RecordField(methodId, type);

        if (!methodId.exported())
            this.__nonExportedMethods.push(id);
    },
    defineMethod: function(methodId, type){
        var base = Type.recordBase(this);
        var id = methodId.id();
        var existingField = this.findSymbol(id);
        if (!existingField || !(existingField.type() instanceof MethodType)){
            throw new Errors.Error(
                  "'" + Type.typeName(this) + "' has no declaration for method '" + id 
                + "'");
        }
        var existing = existingField.type();
        if (!Cast.areProceduresMatch(existing, type))
            throw new Errors.Error(
                  "overridden method '" + id + "' signature mismatch: should be '"
                + existing.procDescription() + "', got '" 
                + type.procDescription() + "'");
        
        this.__definedMethods.push(id);
    },
    requireMethodDefinition: function(id, reason){
        if (!this.__hasMethodDeclaration(id))
            throw new Errors.Error(
                "there is no method '" + id + "' in base type(s)");
        if (this.__finalized)
            this.__ensureMethodDefinitions({reason: [id]});
        else {
            var ids = this.__lazyDefinitions[reason];
            if (!ids){
                ids = [id];
                this.__lazyDefinitions[reason] = ids;
            }
            else if (ids.indexOf(id) == -1)
                ids.push(id);
            }
    },
    requireNewOnly: function(){this.__createByNewOnly = true;},
    abstractMethods: function(){return this.__abstractMethods;},
    __collectAbstractMethods: function(){
        var selfMethods = Object.keys(this.__declaredMethods);
        var baseType = Type.recordBase(this);
        var methods = baseType ? baseType.abstractMethods().concat(selfMethods)
                               : selfMethods;
        for(var i = 0; i < methods.length; ++i){
            var m = methods[i];
            if (this.__definedMethods.indexOf(m) == -1)
                this.__abstractMethods.push(m);
        }
    },
    finalize: function(){
        this.__finalized = true;
        this.__collectAbstractMethods();
        if (this.__instantiated)
            this.__ensureNonAbstract();
        if (this.__declaredAsVariable)
            this.__ensureVariableCanBeDeclared();
        this.__ensureMethodDefinitions(this.__lazyDefinitions);

        for(var i = 0; i < this.__nonExportedMethods.length; ++i)
            delete this.__declaredMethods[this.__nonExportedMethods[i]];
        delete this.__nonExportedMethods;

        Type.Record.prototype.finalize.call(this);
    },
    __ensureMethodDefinitions: function(reasons){
        var result = [];
        for(var reason in reasons){
            var ids = reasons[reason];
            var report = [];
            for(var i = 0; i < ids.length; ++i){
                var m = ids[i];
                if (!this.__hasMethodDefinition(m))
                    report.push(m);
            }
            if (report.length)
                result.push(reason + ": " + report.join(", "));
        }
        if (result.length)
            throw new Errors.Error(result.join("; "));
    },
    __ensureNonAbstract: function(){
        function errMsg(self){
            return "cannot instantiate '" 
                 + Type.typeName(self) 
                 + "' because it has abstract method(s)";
        }

        var am = this.abstractMethods();
        if (am.length)
            throw new Errors.Error(errMsg(this) + ": " + am.join(", ")
                );

        var baseType = Type.recordBase(this);
        while (baseType){
            if (!baseType.__finalized)
                for(var id in baseType.__declaredMethods){
                    if (!this.__hasMethodDefinition(id))
                        baseType.requireMethodDefinition(id, errMsg(this));
                }
            baseType = Type.recordBase(baseType);
        }
    },
    __ensureVariableCanBeDeclared: function(){
        var type = this;
        while (type){
            if (type.__createByNewOnly)
                throw new Errors.Error(
                    "cannot declare a variable of type '" 
                  + Type.typeName(type) + "' (and derived types) "
                  + "because SELF(POINTER) was used in its method(s)");
            type = Type.recordBase(type);
        }
    },
    __hasMethodDeclaration: function(id){
        var type = this;
        var result;
        while (type && !(result = type.__declaredMethods[id]))
            type = Type.recordBase(type);
        return result;
    },
    __hasMethodDefinition: function(id){
        var type = this;
        while (type && type.__definedMethods.indexOf(id) == -1)
            type = Type.recordBase(type);
        return type;
    }
});

function checkOrdinaryExport(id, hint){
    if (id.isReadOnly())
        throw new Errors.Error(hint + " cannot be exported as read-only using '-' mark (did you mean '*'?)");
}

var ConstDecl = Context.ConstDecl.extend({
    init: function EberonContext$ConstDecl(context){
        Context.ConstDecl.prototype.init.call(this, context);
    },
    handleIdentdef: function(id){
        checkOrdinaryExport(id, "constant");
        Context.ConstDecl.prototype.handleIdentdef.call(this, id);
    }
});

var VariableDeclaration = Context.VariableDeclaration.extend({
    init: function EberonContext$VariableDeclaration(context){
        Context.VariableDeclaration.prototype.init.call(this, context);
    },
    handleIdentdef: function(id){
        checkOrdinaryExport(id, "variable");
        Context.VariableDeclaration.prototype.handleIdentdef.call(this, id);
    }
});

var TypeDeclaration = Context.TypeDeclaration.extend({
    init: function EberonContext$TypeDeclaration(context){
        Context.TypeDeclaration.prototype.init.call(this, context);
    },
    handleIdentdef: function(id){
        checkOrdinaryExport(id, "type");
        Context.TypeDeclaration.prototype.handleIdentdef.call(this, id);
    }
});

var RecordDecl = Context.RecordDecl.extend({
    init: function EberonContext$RecordDecl(context){
        var makeRecord = function(name, cons, scope){return new RecordType(name, cons, scope);};
        Context.RecordDecl.prototype.init.call(this, context, makeRecord);
    },
    handleMessage: function(msg){
        if (msg instanceof MethodOrProcMsg)
            return this.type().addMethod(
                msg.id,
                new MethodType(msg.id.id(), msg.type, methodCallGenerator));
        if (msg == Context.endParametersMsg) // not used
            return undefined;
        if (msg instanceof Context.AddArgumentMsg) // not used
            return undefined;
        return Context.RecordDecl.prototype.handleMessage.call(this, msg);
    }
});

function resetTypePromotionMadeInSeparateStatement(msg){
    if (!(msg instanceof TransferPromotedTypesMsg))
        return false;
    resetPromotedTypes(msg.types);
    return true;
}

var ProcOrMethodDecl = Context.ProcDecl.extend({
    init: function EberonContext$ProcOrMethodDecl(parent, stdSymbols){
        Context.ProcDecl.prototype.init.call(this, parent, stdSymbols);
        this.__methodId = undefined;
        this.__methodType = undefined;
        this.__boundType = undefined;
        this.__endingId = undefined;
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

        if (msg == getMethodSuper)
            return this.__handleSuperCall();

        if (msg instanceof MethodOrProcMsg){
            var id = msg.id;
            var type = msg.type;
            if (type){
                this.__methodId = id;
                this.__boundType = type;
            }

            Context.ProcDecl.prototype.handleIdentdef.call(
                this,
                type ? new Context.IdentdefInfo(Type.typeName(type) + "." + id.id(),
                                                id.exported()) 
                     : id
                );
            return undefined;
        }

        if (resetTypePromotionMadeInSeparateStatement(msg))
            return;

        return Context.ProcDecl.prototype.handleMessage.call(this, msg);
    },
    _prolog: function(){
        return this.__boundType
            ? Type.typeName(this.__boundType) + ".prototype." + this.__methodId.id() + " = function("
            : Context.ProcDecl.prototype._prolog.call(this);
    },
    _makeArgumentVariable: function(arg){
        if (!arg.isVar)
            return new TypeNarrowVariable(arg.type, false, true);

        if (arg.type instanceof Type.Record)
            return new TypeNarrowVariable(arg.type, true, false);

        return Context.ProcDecl.prototype._makeArgumentVariable.call(this, arg);
    },
    setType: function(type){
        Context.ProcDecl.prototype.setType.call(this, type);
        if (this.__methodId)
            this.__methodType = new MethodType(this.__methodId.id(), type, methodCallGenerator);
    },
    handleIdent: function(id){
        if (this.__boundType){
            if (!this.__endingId)
                this.__endingId = id + ".";
            else {
                Context.ProcDecl.prototype.handleIdent.call(this, this.__endingId + id);
                this.__endingId = undefined;
            }
        }
        else
            Context.ProcDecl.prototype.handleIdent.call(this, id);
    },
    endParse: function(){
        if (this.__boundType){
            if (this.__endingId)
                // should throw
                Context.ProcDecl.prototype.handleIdent.call(this, this.__endingId);

            this.__boundType.defineMethod(this.__methodId, this.__methodType);
        }
        Context.ProcDecl.prototype.endParse.call(this);
    },
    __handleSuperCall: function(){
        if (!this.__methodId)
            throw new Errors.Error("SUPER can be used only in methods");

        var baseType = Type.recordBase(this.__boundType);
        if (!baseType)
            throw new Errors.Error(
                  "'" + Type.typeName(this.__boundType)
                + "' has no base type - SUPER cannot be used");

        var id = this.__methodId.id();
        baseType.requireMethodDefinition(id, "cannot use abstract method(s) in SUPER calls");
        return {
            info: Type.makeProcedure(new MethodType(id, this.__methodType.procType(), superMethodCallGenerator)),
            code: this.qualifyScope(Type.recordScope(baseType))
                + Type.typeName(baseType) + ".prototype." + id + ".call"
        };
    }
});

var Factor = Context.Factor.extend({
    init: function EberonContext$Factor(context){
        Context.Factor.prototype.init.call(this, context);
        this.__typePromotion = new TypePromotionHandler();
        this.__invert = false;
    },
    handleMessage: function(msg){
        if (this.__typePromotion.handleMessage(msg))
            return;
        return Context.Factor.prototype.handleMessage.call(this, msg);
    },
    handleLiteral: function(s){
        if (s == "~")
            this.__invert = !this.__invert;
        Context.Factor.prototype.handleLiteral.call(this, s);
    },
    endParse: function(){
        if (this.__invert)
            this.__typePromotion.invert();
        this.__typePromotion.transferTo(this.parent());
    }
});

var AddOperator = Context.AddOperator.extend({
    init: function EberonContext$AddOperator(context){
        Context.AddOperator.prototype.init.call(this, context);
    },
    _matchPlusOperator: function(type){
        if (type == EberonString.string() || type instanceof Type.String)
            return eOp.addStr;
        return Context.AddOperator.prototype._matchPlusOperator.call(this, type);
    },
    _expectPlusOperator: function(){return "numeric type or SET or STRING";},
    endParse: function(){
        this.parent().handleLogicalOr();
    }
});

var MulOperator = Context.MulOperator.extend({
    init: function EberonContext$MulOperator(context){
        Context.MulOperator.prototype.init.call(this, context);
    },
    endParse: function(s){
        this.parent().handleLogicalAnd();
    }
});

function PromoteTypeMsg(info, type){
    this.info = info;
    this.type = type;
}

function resetTypePromotionMsg(){}
function resetInvertedPromotedTypesMsg(){}
function invertTypePromotionMsg(){}

function TransferPromotedTypesMsg(types, invertTypes){
    this.types = types;
    this.invertTypes = invertTypes;
}

var RelationOps = Context.RelationOps.extend({
    init: function EberonContext$RelationOps(){
        Context.RelationOps.prototype.init.call(this);
    },
    eq: function(type){
        return type == EberonString.string() 
            ? eOp.equalStr
            : Context.RelationOps.prototype.eq.call(this, type);
    },
    notEq: function(type){
        return type == EberonString.string() 
            ? eOp.notEqualStr
            : Context.RelationOps.prototype.notEq.call(this, type);
    },
    less: function(type){
        return type == EberonString.string() 
            ? eOp.lessStr
            : Context.RelationOps.prototype.less.call(this, type);
    },
    greater: function(type){
        return type == EberonString.string() 
            ? eOp.greaterStr
            : Context.RelationOps.prototype.greater.call(this, type);
    },
    lessEq: function(type){
        return type == EberonString.string() 
            ? eOp.lessEqualStr
            : Context.RelationOps.prototype.lessEq.call(this, type);
    },
    greaterEq: function(type){
        return type == EberonString.string() 
            ? eOp.greaterEqualStr
            : Context.RelationOps.prototype.greaterEq.call(this, type);
    },
    is: function(type, context){
        var impl = Context.RelationOps.prototype.is.call(this, type, context);
        return function(left, right){
            var d = left.designator();
            if (d){
                var v = d.info();
                if (v instanceof TypeNarrowVariable)
                    context.handleMessage(new PromoteTypeMsg(v, type));
            }
            return impl(left, right);
        };
    },
    coalesceType: function(leftType, rightType){
        if ((leftType == EberonString.string() && rightType instanceof Type.String)
            || (rightType == EberonString.string() && leftType instanceof Type.String))
            return EberonString.string();
        return Context.RelationOps.prototype.coalesceType.call(this, leftType, rightType);
    }
});

var Term = Context.Term.extend({
    init: function EberonContext$Term(context){
        Context.Term.prototype.init.call(this, context);
        this.__invertedTypePromotionReset = false;
    },
    handleLogicalAnd: function(){
        if (!this.__invertedTypePromotionReset){
            this.handleMessage(resetInvertedPromotedTypesMsg);
            this.__invertedTypePromotionReset = true;
        }
    }
});

var SimpleExpression = Context.SimpleExpression.extend({
    init: function EberonContext$SimpleExpression(context){
        Context.SimpleExpression.prototype.init.call(this, context);
        this.__typePromotion = new TypePromotionHandler();
        this.__orTypePromotion = this.__typePromotion;
    },
    handleLogicalOr: function(){
        this.__orTypePromotion.reset();
        this.__orTypePromotion.invert();
        if (this.__orTypePromotion != this.__typePromotion)
            this.__typePromotion.transferFrom(this.__orTypePromotion);
        this.__orTypePromotion = new TypePromotionHandler();
    },
    handleMessage: function(msg){
        if (this.__orTypePromotion.handleMessage(msg))
            return;
        return Context.SimpleExpression.prototype.handleMessage.call(this, msg);
    },
    endParse: function(){
        if (this.__orTypePromotion != this.__typePromotion){

            //this.__orTypePromotion.reset();
            this.__orTypePromotion.invert();
            this.__typePromotion.transferFrom(this.__orTypePromotion);
            this.__typePromotion.invert();
        }
        this.__typePromotion.transferTo(this.parent());
        Context.SimpleExpression.prototype.endParse.call(this);
    }
});

var relationOps = new RelationOps();

var Expression = Context.Expression.extend({
    init: function EberonContext$Expression(context){
        Context.Expression.prototype.init.call(this, context, relationOps);
        this.__typePromotion = new TypePromotionHandler();
    },
    handleMessage: function(msg){
        if (this.__typePromotion.handleMessage(msg))
            return;

        return Context.Expression.prototype.handleMessage.call(this, msg);
    },
    handleLiteral: function(s){
        this.__typePromotion.reset();
        Context.Expression.prototype.handleLiteral.call(this, s);
    },
    endParse: function(){
        this.__typePromotion.transferTo(this.parent());
        return Context.Expression.prototype.endParse.call(this);
    }
});

//var id = 0;

var TypePromotionHandler = Class.extend({
    init: function EberonContext$TypePromotionHandler(){
        this.__promotedTypes = [];
        this.__invertPromotedTypes = [];
        //this.__id = id++;
    },
    handleMessage: function(msg){
        if (msg instanceof PromoteTypeMsg){
            var promoted = msg.info;
            var restore = promoted.promoteType(msg.type);
            //log("promote: " + restore.name + "->" + msg.type.name + ", " + this.__id);
            this.__promotedTypes.push({type: promoted, restore: restore});
            return true;
        }
        if (msg instanceof TransferPromotedTypesMsg){
            this.__transferFrom(msg.types, msg.invertTypes);
            return true;
        }
        switch (msg){
            case resetTypePromotionMsg:
                this.reset();
                return true;
            case invertTypePromotionMsg:
                this.invert();
                return true;
            case resetInvertedPromotedTypesMsg:
                this.resetInverted();
                return true;
        }
    return false;
    },
    invert: function(){
        var all = this.__promotedTypes.concat(this.__invertPromotedTypes);
        //log("invert: " + all.length + ", " + this.__id);
        for(var i = 0; i < all.length; ++i){
            //log("\t" + all[i].type.type().name + ", " + this.__id);
            all[i].type.invertType();
        }

        var swap = this.__promotedTypes;
        this.__promotedTypes = this.__invertPromotedTypes;
        this.__invertPromotedTypes = swap;
    },
    reset: function(){
        resetPromotedTypes(this.__promotedTypes);
        this.__promotedTypes = [];
    },
    resetInverted: function(inverted){
        resetPromotedTypes(this.__invertPromotedTypes);
        this.__invertPromotedTypes = [];
    },
    transferTo: function(context){
        if (this.__promotedTypes.length || this.__invertPromotedTypes.length)
            context.handleMessage(new TransferPromotedTypesMsg(this.__promotedTypes, this.__invertPromotedTypes));
    },
    transferFrom: function(other){
        this.__transferFrom(other.__promotedTypes, this.__invertPromotedTypes);
    },
    __transferFrom: function(promotedTypes, invertPromotedTypes){
        //log("transfer, " + this.__id);
        Array.prototype.push.apply(this.__promotedTypes, promotedTypes);
        Array.prototype.push.apply(this.__invertPromotedTypes, invertPromotedTypes);
    }
});

var OperatorScopes = Class.extend({
    init: function EberonContext$OperatorScopes(context){
        this.__context = context;
        this.__scope = undefined;

        this.__typePromotion = new TypePromotionHandler();
        this.__typePromotions = [this.__typePromotion];

        this.alternate();
    },
    handleMessage: function(msg){
        return this.__typePromotion.handleMessage(msg);
    },
    alternate: function(){
        if (this.__scope)
            this.__context.popScope();
        this.__scope = EberonScope.makeOperator(
            this.__context.parent().currentScope(),
            this.__context.language().stdSymbols);
        this.__context.pushScope(this.__scope);

        this.__typePromotion.reset();
        this.__typePromotion.invert();
        this.__typePromotion = new TypePromotionHandler();
        this.__typePromotions.push(this.__typePromotion);
    },
    reset: function(){
        this.__context.popScope();

        for(var i = 0; i < this.__typePromotions.length; ++i){
            this.__typePromotions[i].reset();
        }
    }
});

var While = Context.While.extend({
    init: function EberonContext$While(context){
        Context.While.prototype.init.call(this, context);
        this.__scopes = new OperatorScopes(this);
    },
    handleLiteral: function(s){
        Context.While.prototype.handleLiteral.call(this, s);
        if (s == "ELSIF")
            this.__scopes.alternate();
    },
    handleMessage: function(msg){
        if (this.__scopes.handleMessage(msg))
            return;

        return Context.While.prototype.handleMessage.call(this, msg);
    },
    endParse: function(){
        this.__scopes.reset();
        Context.While.prototype.endParse.call(this);
    }
});

var If = Context.If.extend({
    init: function EberonContext$If(context){
        Context.If.prototype.init.call(this, context);
        this.__scopes = new OperatorScopes(this);
    },
    handleMessage: function(msg){
        if (this.__scopes.handleMessage(msg))
            return;

        return Context.If.prototype.handleMessage.call(this, msg);
    },
    handleLiteral: function(s){
        Context.If.prototype.handleLiteral.call(this, s);
        if (s == "ELSIF" || s == "ELSE")
            this.__scopes.alternate();
    },
    endParse: function(){
        this.__scopes.reset();
        Context.If.prototype.endParse.call(this);
    }
});

var CaseLabel = Context.CaseLabel.extend({
    init: function EberonContext$CaseLabel(context){
        Context.CaseLabel.prototype.init.call(this, context);
    },
    handleLiteral: function(s){
        if (s == ':'){ // statement sequence is expected now
            var scope = EberonScope.makeOperator(
                this.parent().currentScope(),
                this.language().stdSymbols);
            this.pushScope(scope);
        }
    },
    endParse: function(){
        this.popScope();
        Context.CaseLabel.prototype.endParse.call(this);
    }
});

var Repeat = Context.Repeat.extend({
    init: function EberonContext$Repeat(context){
        Context.Repeat.prototype.init.call(this, context);
        var scope = EberonScope.makeOperator(
            this.parent().currentScope(),
            this.language().stdSymbols);
        this.pushScope(scope);
    },
    endParse: function(){
        this.popScope();
        //Context.Repeat.prototype.endParse.call(this);
    }
});

var For = Context.For.extend({
    init: function EberonContext$Repeat(context){
        Context.For.prototype.init.call(this, context);
        var scope = EberonScope.makeOperator(
            this.parent().currentScope(),
            this.language().stdSymbols);
        this.pushScope(scope);
    },
    handleInPlaceInit: function(symbol, code){
        this._handleInitCode(symbol.id(), "for (" + code);
        this._handleInitExpression(symbol.info().type());
    },
    endParse: function(){
        this.popScope();
        Context.For.prototype.endParse.call(this);
    }
});

var ModuleDeclaration = Context.ModuleDeclaration.extend({
    init: function EberonContext$ModuleDeclaration(context){
        Context.ModuleDeclaration.prototype.init.call(this, context);
    },
    handleMessage: function(msg){
        if (resetTypePromotionMadeInSeparateStatement(msg))
            return;

        return Context.ModuleDeclaration.prototype.handleMessage.call(this, msg);
    }
});

exports.AddOperator = AddOperator;
exports.CaseLabel = CaseLabel;
exports.ConstDecl = ConstDecl;
exports.Designator = Designator;
exports.Expression = Expression;
exports.ExpressionProcedureCall = ExpressionProcedureCall;
exports.For = For;
exports.Identdef = Identdef;
exports.If = If;
exports.MethodHeading = MethodHeading;
exports.ModuleDeclaration = ModuleDeclaration;
exports.MulOperator = MulOperator;
exports.AssignmentOrProcedureCall = AssignmentOrProcedureCall;
exports.Factor = Factor;
exports.ProcOrMethodId = ProcOrMethodId;
exports.ProcOrMethodDecl = ProcOrMethodDecl;
exports.RecordDecl = RecordDecl;
exports.Repeat = Repeat;
exports.SimpleExpression = SimpleExpression;
exports.InPlaceVariableInit = InPlaceVariableInit;
exports.InPlaceVariableInitFor = InPlaceVariableInitFor;
exports.Term = Term;
exports.TypeDeclaration = TypeDeclaration;
exports.VariableDeclaration = VariableDeclaration;
exports.While = While;
