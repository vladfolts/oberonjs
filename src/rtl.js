function Class(){}
Class.extend = function extend(methods){
	methods.__proto__ = this.prototype; // make instanceof work

	// to see constructor name in diagnostic
	var result = methods.init;
	methods.constructor = result.prototype.constructor;

	result.prototype = methods;
	result.extend = extend;
	return result;
};

function RTLTypeGuard(from, to){
	if (!(from instanceof to))
		throw new Error("typeguard assertion failed");
	return from;
}

function RTLMakeArray(/*dimensions, initializer*/){
	var forward = Array.prototype.slice.call(arguments);
	var result = new Array(forward.shift());
	var i;
	if (forward.length == 1){
		var init = forward[0];
		if (typeof init == "function")
			for(i = 0; i < result.length; ++i)
				result[i] = init();
		else
			for(i = 0; i < result.length; ++i)
				result[i] = init;
	}
	else
		for(i = 0; i < result.length; ++i)
			result[i] = RTLMakeArray.apply(this, forward);
	return result;
}

function RTLMakeSet(/*...*/){
	var result = 0;
	
	function checkBit(b){
		if (b < 0 || b > 31)
			throw new Error("integes between 0 and 31 expected, got " + b);
	}

	function setBit(b){
		checkBit(b);
		result |= 1 << b;
	}
	
	for(var i = 0; i < arguments.length; ++i){
		var b = arguments[i];
		if (b instanceof Array){
			var from = b[0];
			var to = b[1];
			if (from < to)
				throw new Error("invalid SET diapason: " + from + ".." + to);
			for(var bi = from; bi <= to; ++bi)
				setBit(bi);
		}
		else
			setBit(b);
	}
	return result;
}

function RTLMakeRef(obj, prop){
    return {set: function(v){ obj[prop] = v; },
            get: function(){ return obj[prop]; }};
}

function RTLSetInclL(l, r){
	return l & r == l;
}

function RTLSetInclR(l, r){
	return l & r == r;
}

function RTLAssignArrayFromString(a, s){
	var i;
	for(i = 0; i < s.length; ++i)
		a[i] = s.charCodeAt(i);
	for(i = s.length; i < a.length; ++i)
		a[i] = 0;
}

exports.Class = Class;
exports.RTL = Class.extend({
	init: function RTL(){
		this.__entries = {};
		this.__supportJS = false;
	},
	supportJS: function(){this.__supportJS = true;},
	baseClass: function(){
		if (!this.__entries["extend"])
			this.__entries.extend = Class.extend;
		return "RTL$";
	},
	genCast: function(obj, type){
		if (!this.__entries["typeGuard"])
			this.__entries.typeGuard = RTLTypeGuard;

		return "RTL$.typeGuard(" + obj + ", " + type.name() + ")";
	},
	makeRef: function(obj, prop){
		if (!this.__entries["makeRef"])
			this.__entries.makeRef = RTLMakeRef;
		return "RTL$.makeRef(" + obj + ", " + prop + ")";
	},
	makeArray: function(args){
		if (!this.__entries.makeArray)
			this.__entries.makeArray = RTLMakeArray;
		return "RTL$.makeArray(" + args + ")";
	},
	makeSet: function(args){
		if (!this.__entries["makeSet"])
			this.__entries.makeSet = RTLMakeSet;
		return "RTL$.makeSet(" + args + ")";
	},
	setInclL: function(args){
		if (!this.__entries.setInclL)
			this.__entries.setInclL = RTLSetInclL;
		return "RTL$.setInclL(" + args + ")";
	},
	setInclR: function(args){
		if (!this.__entries.setInclR)
			this.__entries.setInclR = RTLSetInclR;
		return "RTL$.setInclR(" + args + ")";
	},
	assignArrayFromString: function(a, s){
		if (!this.__entries.assignArrayFromString)
			this.__entries.assignArrayFromString = RTLAssignArrayFromString;
		return "RTL$.assignArrayFromString(" + a + ", " + s + ")";
	},
	generate: function(){
		var result = "var RTL$ = {\n";
		var firstEntry = true;
		for (var name in this.__entries){
			if (!firstEntry)
				result += ",\n";
			else
				firstEntry = false;
			result += "\t" + name + ": " + this.__entries[name].toString().replace(/\n/g, "\n\t");
		}
		if (!firstEntry)
			result += "\n};\n";
		else
			result = "";
		
		if (this.__supportJS)
			result += "var JS = function(){return this;}();\n";
		return result;
	}
});
