var RTL$ = {
    makeArray: function (/*dimensions, initializer*/){
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
                result[i] = this.makeArray.apply(this, forward);
        return result;
    },
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
    makeRef: function (obj, prop){
        return {set: function(v){ obj[prop] = v; },
                get: function(){ return obj[prop]; }};
    }
};
var m = function (){
var R = RTL$.extend({
	init: function R(){
		this.i = 0;
		this.byte = 0;
		this.a = RTL$.makeArray(3, 0);
		this.p = null;
	}
});
var i = 0;
var byte = 0;
var b = false;
var a = RTL$.makeArray(5, 0);
var byteArray = RTL$.makeArray(3, 0);

function p1(i1/*VAR INTEGER*/, i2/*VAR INTEGER*/, byte/*VAR BYTE*/){
	i1.set(1);
	i2.set(2);
	byte.set(3 & 0xFF);
}

function p2(i/*INTEGER*/, byte/*BYTE*/, b/*BOOLEAN*/){
}

function index(i/*VAR INTEGER*/){
	return i.get();
}

function indexByte(b/*VAR BYTE*/){
	return b.get();
}

function array(a/*VAR ARRAY OF INTEGER*/){
	return a[0];
}

function p3(i/*VAR INTEGER*/, byte/*VAR BYTE*/, b/*VAR BOOLEAN*/){
	var j = 0;
	var r = new R();
	var ar = RTL$.makeArray(5, function(){return new R();});
	var ai = RTL$.makeArray(5, 0);
	j = i.get() + 1 | 0;
	j = 2 * i.get() | 0;
	j = i.get() / 2 | 0;
	j = -i.get();
	b.set(!b.get());
	a[i.get()] = i.get();
	p1({set: function($v){j = $v;}, get: function(){return j;}}, i, byte);
	p1(i, {set: function($v){j = $v;}, get: function(){return j;}}, byte);
	p1(i, RTL$.makeRef(a, index(i)), RTL$.makeRef(byteArray, indexByte(byte)));
	p2(i.get(), byte.get(), b.get());
	p1(RTL$.makeRef(r, "i"), RTL$.makeRef(ar[index(RTL$.makeRef(r, "i"))], "i"), RTL$.makeRef(ar[index(RTL$.makeRef(r, "i"))], "byte"));
	r.p = new R();
	ar[j].p = new R();
	p1(RTL$.makeRef(r.p, "i"), RTL$.makeRef(ar[j].p, "i"), RTL$.makeRef(ar[j].p, "byte"));
	p2(ar[j].p.i, ar[j].p.byte, r.p.i == ar[j].p.i);
	j = array(ai);
	j = array(r.a);
}
p3({set: function($v){i = $v;}, get: function(){return i;}}, {set: function($v){byte = $v;}, get: function(){return byte;}}, {set: function($v){b = $v;}, get: function(){return b;}});
}();
