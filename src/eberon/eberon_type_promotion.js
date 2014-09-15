"use strict";

var Class = require("rtl.js").Class;

function log(s){
    //console.info(s);
}

function assert(condition){
    if (!condition)
        throw new Error("assertion failed");
}

var Promotion = Class.extend({
    init: function EberonTypePromotion$Promotion(v, type, inverted){
        this.__v = v;
        this.__type = type;
        this.__originalType = v.type();
        this.__inverted = inverted;
    },
    and: function(){
        if (!this.__inverted)
            this.__v.setType(this.__type);
    },
    or: function(){
        if (this.__inverted)
            this.__v.setType(this.__type);
    },
    reset: function(){
        this.__v.setType(this.__originalType);
    },
    invert: function(){
        this.__inverted = !this.__inverted;
    }
});

var MaybePromotion = Class.extend({
    init: function EberonTypePromotion$Promotion(handle){
        this.__inverted = false;
        this.__handle = handle;
    },
    promote: function(v, type){
        log("promote: " + type.name);
        this.__handle(new Promotion(v, type, this.__inverted));
    },
    invert: function(){
        this.__inverted = !this.__inverted;
    },
    makeOr: function(){
        var result = new OrPromotions(this.__inverted);
        this.__handle(result);
        return result;
    },
    makeAnd: function(){
        var result = new AndPromotions(this.__inverted);
        this.__handle(result);
        return result;
    }
});

var CombinedPromotion = Class.extend({
    init: function EberonTypePromotion$CombinedPromotion(op, invertedOp, inverted){
        this.__op = op;
        this.__invertedOp = invertedOp;
        this.__inverted = inverted;
        this.__promotions = [];
        this.__current = undefined;
        this.__count = 0;
    },
    and: function(){
        log("combined and(" + this.__op + "), inverted: " + this.__inverted);
        if (this.__inverted)
            this.__applyForAll();
        else
            this.__applyIfSingle();
    },
    or: function(){
        log("combined or(" + this.__op + "), inverted: " + this.__inverted);
        if (this.__inverted)
            this.__applyIfSingle();
        else
            this.__applyForAll();
    },
    reset: function(){
        for(var i = this.__promotions.length; i--;){
            var p = this.__promotions[i];
            p.reset();
        }
    },
    clear: function(){
        this.reset();
        this.__promotions = [];
        this.__current = undefined;
        this.__count = 0;
    },
    next: function(p){
        log("next " + this.__op + ": " + this.__current);
        if (this.__current)
            this.__current[this.__op]();

        this.__current = undefined;
        ++this.__count;

        return new MaybePromotion(this.__handlePromotion.bind(this));
    },
    __applyForAll: function(){
        for(var i = 0; i < this.__promotions.length; ++i)
            this.__promotions[i][this.__op]();
    },
    __applyIfSingle: function(op){
        log("applyIfSingle: " + this.__count);
        if (this.__count > 1)
            this.reset();
        else if (this.__current)
            this.__current[this.__invertedOp]();
    },
    __handlePromotion: function(p){
        assert(!this.__current);
        this.__promotions.push(p);
        this.__current = p;
    }
});

var AndPromotions = CombinedPromotion.extend({
    init: function EberonTypePromotion$AndPromotions(inverted){
        log("AndPromotions");
        CombinedPromotion.prototype.init.call(this, "and", "or", !inverted);
    }
});

var OrPromotions = CombinedPromotion.extend({
    init: function EberonTypePromotion$OrPromotions(inverted){
        log("OrPromotions");
        CombinedPromotion.prototype.init.call(this, "or", "and", inverted);
    }
});

exports.Promotion = Promotion;
exports.AndPromotions = AndPromotions;
exports.OrPromotions = OrPromotions;
