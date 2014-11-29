"use strict";

var Cast = require("js/Cast.js");
var Class = require("rtl.js").Class;
var Code = require("js/Code.js");
var CodeGenerator = require("js/CodeGenerator.js");
var Context = require("context.js");
var EberonConstructor= require("js/EberonConstructor.js");
var EberonDynamicArray= require("js/EberonDynamicArray.js");
var EberonScope = require("js/EberonScope.js");
var EberonString = require("js/EberonString.js");
var EberonTypes = require("js/EberonTypes.js");
var Errors = require("js/Errors.js");
var op = require("js/Operator.js");
var eOp = require("js/EberonOperator.js");
var Symbol = require("js/Symbols.js");
var Procedure = require("js/Procedure.js");
var Type = require("js/Types.js");
var TypePromotion = require("eberon/eberon_type_promotion.js");

/*
function log(s){
    console.info(s);
}
*/

function superMethodCallGenerator(context, type){
    var args = Procedure.makeArgumentsCode(context);
    args.write(Code.makeExpression("this"));
    return Procedure.makeProcCallGeneratorWithCustomArgs(context, type, args);
}

function MethodOrProcMsg(id, type, isConstructor){
    this.id = id;
    this.type = type;
    this.isConstructor = isConstructor;
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

        var isConstructor = false;
        if (!this.__type){
            var s = this.currentScope().findSymbol(id.id());
            if (s){
                var info = s.symbol().info();
                if (info instanceof Type.TypeId){
                    var boundType = info.type();
                    if (boundType instanceof Type.Record){
                        this.__type = boundType;
                        isConstructor = true;
                    }
                }
            }
        }

        this.handleMessage(new MethodOrProcMsg(id, this.__type, isConstructor));
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
    init: function TypeNarrowVariable(type, isRef, isReadOnly){
        this.__type = type;
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

function makeConstructorCall(context, type){
    var l = context.language();
    var cx = {
        types: l.types, 
        rtl: l.rtl, 
        qualifyScope: context.qualifyScope.bind(context)
        };
    return EberonConstructor.makeConstructorCall(type, cx);
    }

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
    _makeDerefVar: function(info){
        if (info instanceof TypeNarrowVariable)
            return new DereferencedTypeNarrowVariable(info);
        return Context.Designator.prototype._makeDerefVar(info);
    },
    handleMessage: function(msg){
        if (msg == Context.beginCallMsg)
            return this.__beginCall();
        if (msg == Context.endCallMsg)
            return this.__endCall();

        // no type promotion after calling functions
        if (breakTypePromotion(msg))
            return;
        
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
            this._advance(pointerType, info, "");
        }
        else if (s == "SUPER"){
            var ms = this.handleMessage(getMethodSuper);
            this._advance(ms.info.type, ms.info, ms.code);
        }
        else 
            Context.Designator.prototype.handleLiteral.call(this, s);
    },
    __beginCall: function(){
        var type = this._currentType();
        if (type instanceof Type.TypeId && type.type() instanceof Type.Record){
            this.__procCall = makeConstructorCall(this, type.type());
            this._discardCode();
        }
        else
            this.__procCall = Context.makeProcCall(this, type, this._currentInfo());
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
                         : new TypeNarrowVariable(type, false, false);
        this._symbol = Symbol.makeSymbol(this.__id, v);
        if (type instanceof Type.Record){
            type.initializer(this, false); // checks for abstract etc.
            if (e.designator())
                this._code += this.language().rtl.cloneRecord(e.code());
            else // do not clone if it is temporary, e.g. constructor call
                this._code += e.code();
        }
        else if (type instanceof Type.Array){
            if (type instanceof Type.OpenArray)
                throw new Errors.Error("cannot initialize variable '" + this.__id + "' with open array");
            this._code += Cast.cloneArray(type, e.code(), this.language().rtl);
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
    },
    setDesignator: function(d){
        var info = d.info();
        var parent = this.parent();
        if (info instanceof ResultVariable){
            var e = info.expression();
            parent.handleExpression(Code.makeExpressionWithPrecedence(d.code(), d.type(), undefined, e.constValue(), e.maxPrecedence()));
        }
        else
            parent.setDesignator(d);
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
    codeGenerator: function(){return CodeGenerator.nullGenerator();},
    endParse: function(){
        var d = this.__left;
        var type = d.type();
        var code;
        if (this.__right){
        /*    if (type instanceof EberonDynamicArray.DynamicArray){
                if (!(this.__right.type() instanceof Type.Array))
                    throw new Errors.Error("type mismatch");
                code = d.code() + " = " + this.language().rtl.clone(this.__right.code());
            }
            else */{
                var left = Code.makeExpression(d.code(), type, d);
                code = op.assign(left, this.__right, this.language());
            } 
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

var RecordField = Context.RecordField.extend({
    init: function EberonContext$RecordField(field, type, recordType){
        Context.RecordField.prototype.init.call(this, field, type);
        this.__recordType = recordType;
    },
    asVar: function(isReadOnly, context){ 
        if (!isReadOnly && context.qualifyScope(Type.recordScope(this.__recordType)))
            isReadOnly = this.identdef().isReadOnly();
        return Context.RecordField.prototype.asVar.call(this, isReadOnly); 
    }
});

var RecordFieldAsMethod = Context.RecordField.extend({
    init: function EberonContext$RecordFieldAsMethod(field, type){
        Context.RecordField.prototype.init.call(this, field, type);
    },
    asVar: function(){ 
        return EberonTypes.makeMethod(this.type()); 
    }
});
var RecordType = Class.extend.call(Type.Record, {
    init: function EberonContext$RecordType(name, cons, scope){
        Type.Record.call(this);
        Type.initRecord(this, name, cons, scope);
        this.__customConstructor = undefined;
        this.__finalized = false;
        this.__declaredMethods = {};
        this.__definedMethods = [];
        this.__abstractMethods = [];
        this.__instantiated = false;
        this.__createByNewOnly = false;
        this.__declaredAsVariable = false;
        this.__lazyDefinitions = {};
        this.__nonExportedMethods = [];
        this.__inheritanceCode = undefined;
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
    customConstructor: function(){return this.__customConstructor;},
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
                  existingField.type() instanceof EberonTypes.MethodType
                ?   "cannot declare a new method '" + id 
                  + "': method already was declared"
                : "cannot declare method, record already has field '" + id + "'");

        this.__declaredMethods[id] = new RecordFieldAsMethod(methodId, type);

        if (!methodId.exported())
            this.__nonExportedMethods.push(id);
    },
    setRecordInitializationCode: function(fieldsInitializationCode, inheritanceCode){
        this.__fieldsInitializationCode = fieldsInitializationCode;
        this.__inheritanceCode = inheritanceCode;
    },
    fieldsInitializationCode: function(){return this.__fieldsInitializationCode;},
    defineConstructor: function(type){
        if (this.__customConstructor)
            throw new Errors.Error("constructor '" + Type.typeName(this) + "' already defined");
        if (type.result())
            throw new Errors.Error("constructor '" + Type.typeName(this) + "' cannot have result type specified");
        this.__customConstructor = type;
        return this.__inheritanceCode;
    },
    defineMethod: function(methodId, type){
        var base = Type.recordBase(this);
        var id = methodId.id();

        if (this.__definedMethods.indexOf(id) != -1)
            throw new Errors.Error(
                  "method '" + Type.typeName(this) + "." + id + "' already defined");

        var existingField = this.findSymbol(id);
        if (!existingField || !(existingField.type() instanceof EberonTypes.MethodType)){
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
        while (type && !type.__declaredMethods.hasOwnProperty(id))
            type = Type.recordBase(type);
        return type && type.__declaredMethods[id];
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
                EberonTypes.makeMethodType(msg.id.id(), msg.type, Procedure.makeProcCallGenerator));
        if (msg == Context.endParametersMsg) // not used
            return undefined;
        if (msg instanceof Context.AddArgumentMsg) // not used
            return undefined;
        return Context.RecordDecl.prototype.handleMessage.call(this, msg);
    },
    _makeField: function(field, type){
        return new RecordField(field, type, this.__type);
    },
    endParse: function(){
        var gen = this.codeGenerator();
        var pos = gen.makeInsertion();
        var type = this.type();
        var inheritanceCode = this._generateInheritance();
        type.setRecordInitializationCode(
            this._generateFieldsInitializationCode(), 
            inheritanceCode);
        this.currentScope().addFinalizer(function(){
            if (!this.__type.customConstructor())
                gen.insert(pos, this._generateConstructor() + inheritanceCode);
        }.bind(this));
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

var ProcOrMethodDecl = Context.ProcDecl.extend({
    init: function EberonContext$ProcOrMethodDecl(parent, stdSymbols){
        Context.ProcDecl.prototype.init.call(this, parent, stdSymbols);
        this.__methodId = undefined;
        this.__methodType = undefined;
        this.__boundType = undefined;
        this.__endingId = undefined;
        this.__isConstructor = false;
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
                this.__isConstructor = msg.isConstructor;
            }

            Context.ProcDecl.prototype.handleIdentdef.call(this, id);
            return;
        }

        if (handleTypePromotionMadeInSeparateStatement(msg))
            return;

        return Context.ProcDecl.prototype.handleMessage.call(this, msg);
    },
    _prolog: function(){
        return this.__boundType
            ? this.__isConstructor ? "function " + Type.typeName(this.__boundType) + "("
                                   : Type.typeName(this.__boundType) + ".prototype." + this.__methodId.id() + " = function("
            : Context.ProcDecl.prototype._prolog.call(this);
    },
    _beginBody: function(){
        Context.ProcDecl.prototype._beginBody.call(this);
        if (this.__isConstructor)
            this.codeGenerator().write(this.__boundType.fieldsInitializationCode());
    },
    _makeArgumentVariable: function(arg){
        if (!arg.isVar)
            return new TypeNarrowVariable(arg.type, false, true);

        if (arg.type instanceof Type.Record)
            return new TypeNarrowVariable(arg.type, true, false);

        return Context.ProcDecl.prototype._makeArgumentVariable.call(this, arg);
    },
    setType: function(type){
        if (this.__methodId){
            this.__methodType = EberonTypes.makeMethodType(this.__methodId.id(), type, Procedure.makeProcCallGenerator);
            this.__type = type;
            }            
        else
            Context.ProcDecl.prototype.setType.call(this, type);
    },
    handleIdent: function(id){
        if (!this.__boundType)
            Context.ProcDecl.prototype.handleIdent.call(this, id);
        else if (this.__endingId)
            this.__endingId = this.__endingId + "." + id;
        else
            this.__endingId = id;
    },
    endParse: function(){
        Context.ProcDecl.prototype.endParse.call(this);

        if (this.__boundType){
            if (this.__endingId){
                var expected 
                    = (this.__isConstructor 
                             ? ""
                             : (Type.typeName(this.__boundType) + "."))
                    + this.__id.id();
                if (this.__endingId != expected)
                    throw new Errors.Error(
                          "mismatched method names: expected '" 
                        + expected
                        + "' at the end (or nothing), got '" 
                        + this.__endingId + "'");
            }

            if (this.__isConstructor)
                this.codeGenerator().write(
                    this.__boundType.defineConstructor(this.__methodType));
            else
                this.__boundType.defineMethod(this.__methodId, this.__methodType);
        }
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
            info: Type.makeProcedure(EberonTypes.makeMethodType(id, this.__methodType.procType(), superMethodCallGenerator)),
            code: this.qualifyScope(Type.recordScope(baseType))
                + Type.typeName(baseType) + ".prototype." + id + ".call"
        };
    }
});

var Factor = Context.Factor;

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

function TransferPromotedTypesMsg(promotion){
    this.promotion = promotion;
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
                if (v instanceof TypeNarrowVariableBase)
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

function BeginTypePromotionAndMsg(){
    this.result = undefined;
}

function BeginTypePromotionOrMsg(){
    this.result = undefined;
}

var Term = Context.Term.extend({
    init: function EberonContext$Term(context){
        Context.Term.prototype.init.call(this, context);
        this.__typePromotion = undefined;
        this.__currentPromotion = undefined;
        this.__andHandled = false;
    },
    handleMessage: function(msg){
        if (msg instanceof PromoteTypeMsg) {
            var promoted = msg.info;
            var p = this.__getCurrentPromotion();
            if (p)
                p.promote(promoted, msg.type);
            return;
        }
        if (msg instanceof BeginTypePromotionOrMsg){
            var cp = this.__getCurrentPromotion();
            if (cp)
                msg.result = cp.makeOr();
            return;
        }
        return Context.Term.prototype.handleMessage.call(this, msg);
    },
    handleLogicalAnd: function(){
        if (this.__typePromotion)
            this.__currentPromotion = this.__typePromotion.next();
        else
            this.__andHandled = true;
    },
    handleLogicalNot: function(){
        Context.Term.prototype.handleLogicalNot.call(this);
        var p = this.__getCurrentPromotion();
        if (p)
            p.invert();
    },
    __getCurrentPromotion: function(){
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

var SimpleExpression = Context.SimpleExpression.extend({
    init: function EberonContext$SimpleExpression(context){
        Context.SimpleExpression.prototype.init.call(this, context);
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
        return Context.SimpleExpression.prototype.handleMessage.call(this, msg);
    },
    endParse: function(){
        if (this.__typePromotion)
            this.parent().handleTypePromotion(this.__typePromotion);
        Context.SimpleExpression.prototype.endParse.call(this);
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

var Expression = Context.Expression.extend({
    init: function EberonContext$Expression(context){
        Context.Expression.prototype.init.call(this, context, relationOps);
        this.__typePromotion = undefined;
        this.__currentTypePromotion = undefined;
    },
    handleMessage: function(msg){
        if (msg instanceof TransferPromotedTypesMsg)
            return;
        return Context.Expression.prototype.handleMessage.call(this, msg);
    },
    handleTypePromotion: function(t){
        this.__currentTypePromotion = t;
    },
    handleLiteral: function(s){
        if (this.__currentTypePromotion){
            this.__currentTypePromotion.clear();
        }
        Context.Expression.prototype.handleLiteral.call(this, s);
    },
    endParse: function(){
        if (this.__currentTypePromotion)
            this.parent().handleMessage(new TransferPromotedTypesMsg(this.__currentTypePromotion));
        return Context.Expression.prototype.endParse.call(this);
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
        if (this.__scope)
            this.__context.popScope();
        this.__scope = EberonScope.makeOperator(
            this.__context.currentScope(),
            this.__context.language().stdSymbols);
        this.__context.pushScope(this.__scope);

        if (this.__typePromotion){
            this.__typePromotion.reset();
            this.__typePromotion.or();
            this.__typePromotion = undefined;
        }
        this.__ignorePromotions = false;
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
        if (s == "DO")
            this.__scopes.doThen();
        else if (s == "ELSIF")
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
        if (s == "THEN")
            this.__scopes.doThen();
        else if (s == "ELSIF" || s == "ELSE")
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

var Return = Context.Return.extend({
    init: function EberonContext$Return(context){
        Context.Return.prototype.init.call(this, context);
    },
    handleExpression: function(e){
        var type = e.type();
        if (type instanceof Type.Array)
            e = Code.makeSimpleExpression(Cast.cloneArray(type, e.code(), this.language().rtl), type);
        Context.Return.prototype.handleExpression.call(this, e);
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

var dynamicArrayLength = -1;

var ArrayDimensions = Context.ArrayDimensions.extend({
    init: function EberonContext$ArrayDimensions(context){
        Context.ArrayDimensions.prototype.init.call(this, context);
    },
    handleLiteral: function(s){
        if ( s == "*" )
            this._addDimension(dynamicArrayLength);
        else
            Context.ArrayDimensions.prototype.handleLiteral.call(this, s);
    }
});

var ArrayDecl = Context.ArrayDecl.extend({
    init: function EberonContext$ArrayDecl(context){
        Context.ArrayDecl.prototype.init.call(this, context);
    },
    _makeInit: function(type, dimensions, length){
        if (length == dynamicArrayLength)
            return '[]';
        return Context.ArrayDecl.prototype._makeInit.call(this, type, dimensions, length);
    },
    _makeType: function(elementsType, init, length){
        return length == dynamicArrayLength
            ? EberonDynamicArray.makeDynamicArray(elementsType)
            : Context.ArrayDecl.prototype._makeType.call(this, elementsType, init, length);
    }
});

function assertArgumentIsNotNonVarDynamicArray(msg){
    if (msg instanceof Context.AddArgumentMsg){
        var arg = msg.arg;
        if (!arg.isVar){
            var type = arg.type;
            while (type instanceof Type.Array){
                if (type instanceof EberonDynamicArray.DynamicArray)
                    throw new Errors.Error("dynamic array has no use as non-VAR argument '" + msg.name + "'");
                type = Type.arrayElementsType(type);
            }
        }
    }
}

var FormalParameters = Context.FormalParameters.extend({
    init: function EberonContext$FormalParameters(context){
        Context.FormalParameters.prototype.init.call(this, context);
    },
    handleMessage: function(msg){
        assertArgumentIsNotNonVarDynamicArray(msg);
        return Context.FormalParameters.prototype.handleMessage.call(this, msg);
    },
    _checkResultType: function(type){
        if (type instanceof EberonDynamicArray.DynamicArray)
            return;
        Context.FormalParameters.prototype._checkResultType.call(this, type);
    }
});

var FormalType = Context.HandleSymbolAsType.extend({
    init: function EberonContext$FormalType(context){
        Context.HandleSymbolAsType.prototype.init.call(this, context);
        this.__arrayDimensions = [];
        this.__dynamicDimension = false;
    },
    setType: function(type){           
        for(var i = this.__arrayDimensions.length; i--;){
            type = this.__arrayDimensions[i] 
                ? EberonDynamicArray.makeDynamicArray(type)
                : this.language().types.makeOpenArray(type);
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

var FormalParametersProcDecl = Context.FormalParametersProcDecl.extend({
    init: function EberonContext$FormalParametersProcDecl(context){
        Context.FormalParametersProcDecl.prototype.init.call(this, context);
    },
    handleMessage: function(msg){
        assertArgumentIsNotNonVarDynamicArray(msg);
        return Context.FormalParametersProcDecl.prototype.handleMessage.call(this, msg);
    },
    _checkResultType: function(type){
        if (type instanceof EberonDynamicArray.DynamicArray)
            return;
        Context.FormalParametersProcDecl.prototype._checkResultType.call(this, type);
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
exports.CaseLabel = CaseLabel;
exports.ConstDecl = ConstDecl;
exports.Designator = Designator;
exports.Expression = Expression;
exports.ExpressionProcedureCall = ExpressionProcedureCall;
exports.For = For;
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
exports.ProcOrMethodId = ProcOrMethodId;
exports.ProcOrMethodDecl = ProcOrMethodDecl;
exports.RecordDecl = RecordDecl;
exports.Repeat = Repeat;
exports.Return = Return;
exports.SimpleExpression = SimpleExpression;
exports.InPlaceVariableInit = InPlaceVariableInit;
exports.InPlaceVariableInitFor = InPlaceVariableInitFor;
exports.Term = Term;
exports.TypeDeclaration = TypeDeclaration;
exports.VariableDeclaration = VariableDeclaration;
exports.While = While;
