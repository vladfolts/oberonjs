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
    }
};
var test = function (JS){
var State = RTL$.extend({
	init: function State(){
		this.f = null;
		this.k = 0;
		this.x1 = null;
		this.x2 = null;
		this.x3 = null;
		this.x4 = null;
		this.x5 = null;
	}
});
var pB = null;

function call(s/*PState*/){
	return s.f(s);
}

function makeEmptyState(f/*Function*/){
	var result = null;
	result = new State();
	result.f = f;
	return result;
}

function makeState(f/*Function*/, k/*INTEGER*/, x1/*PState*/, x2/*PState*/, x3/*PState*/, x4/*PState*/, x5/*PState*/){
	var result = null;
	result = makeEmptyState(f);
	result.k = k;
	result.x1 = x1;
	result.x2 = x2;
	result.x3 = x3;
	result.x4 = x4;
	result.x5 = x5;
	return result;
}

function F0(s/*PState*/){
	return 0;
}

function F1(s/*PState*/){
	return 1;
}

function Fn1(s/*PState*/){
	return -1;
}

function A(s/*PState*/){
	var res = 0;
	if (s.k <= 0){
		res = call(s.x4) + call(s.x5);
	}
	else {
		res = call(makeState(pB, s.k, s.x1, s.x2, s.x3, s.x4, s.x5));
	}
	return res;
}

function B(s/*PState*/){
	--s.k;
	return call(makeState(A, s.k, s, s.x1, s.x2, s.x3, s.x4));
}
pB = B;
JS.alert(call(makeState(A, 10, makeEmptyState(F1), makeEmptyState(Fn1), makeEmptyState(Fn1), makeEmptyState(F1), makeEmptyState(F0))));
}(this);
