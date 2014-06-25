var RTL$ = {
    extend: function extend(methods){
        function Type(){
            for(var m in methods)
                this[m] = methods[m];
        }
        Type.prototype = this.prototype;

        var result = methods.init;
        result.prototype = new Type(); // inherit this.prototype
        result.prototype.constructor = result; // to see constructor name in diagnostic
        
        result.extend = extend;
        return result;
    },
    clone: function (from){
        var to = new from.constructor();
        this.copy(from, to);
        return to;
    },
    copy: function (from, to){
        for(var prop in to){
            if (to.hasOwnProperty(prop)){
                var v = from[prop];
                if (v !== null && typeof v == "object")
                    this.copy(v, to[prop]);
                else
                    to[prop] = v;
            }
        }
    }
};
var m = function (){
var T = RTL$.extend({
	init: function T(){
	}
});
var r = new T();
var i = 0;

function p(){
	return false;
}

function void$(){
}

function valueArgs(r/*T*/, i/*INTEGER*/){
	var v1 = RTL$.clone(r);
	var v2 = i;
}

function varArgs(r/*VAR T*/, i/*VAR INTEGER*/){
	var v1 = RTL$.clone(r);
	var v2 = i.get();
}
var v1 = 0;
var v2 = 1.23;
var v3 = "abc";
var v4 = true;
var v5 = i;
var v6 = i + i | 0;
var v7 = p();
var v8 = void$;
var do$ = 0;
var tempRecord = RTL$.clone(r);
}();
