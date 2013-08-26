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
var m = function (){

function p1(arg1/*INTEGER*/){
	var T1 = RTL$.extend({
		init: function T1(){
			this.field1 = 0;
		}
	});
	var T2 = T1.extend({
		init: function T2(){
			T1.prototype.init.call(this);
			this.field2 = false;
		}
	});
	var i = 0;var j = 0;
	var b = false;
	var t1 = new T1();
	var t2 = new T2();
	i = arg1 + 1;
	t1.field1 = i;
	t2.field1 = t1.field1;
	b = true;
	t2.field2 = b;
}

function p2(){
	p1(123);
}

function p3(i/*INTEGER*/){
	p1(123);
	p2();
	p2();
	return 123;
}

function p4(){
	return p3(123) + p3(p3(123));
}

function p5(){
	return p5;
}

function emptyBegin(){
}

function emptyBeginWithReturn(){
	return 0;
}
}();
