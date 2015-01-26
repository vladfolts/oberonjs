var RTL$ = {
    extend: function (cons, base){
        function Type(){}
        Type.prototype = base.prototype;
        cons.prototype = new Type();
        cons.prototype.constructor = cons;
    }
};
var m = function (){
var i = 0;
var byte = 0;

function p1(arg1/*INTEGER*/){
	function T1(){
		this.field1 = 0;
	}
	function T2(){
		T1.call(this);
		this.field2 = false;
	}
	RTL$.extend(T2, T1);
	var i = 0;var j = 0;
	var b = false;
	var t1 = new T1();
	var t2 = new T2();
	i = arg1 + 1 | 0;
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
	return p3(123) + p3(p3(123)) | 0;
}

function p5(){
	return p5;
}

function emptyBegin(){
}

function emptyBeginWithReturn(){
	return 0;
}

function withByteArgument(b/*BYTE*/){
}

function withByteResult(){
	return 0 & 0xFF;
}

function withByteResult2(b/*BYTE*/){
	return b;
}

function withByteResult3(b/*VAR BYTE*/){
	return b.get();
}

function withByteResult4(){
	var b = 0;
	b = 0 & 0xFF;
	return b;
}
byte = withByteResult();
i = withByteResult();
withByteArgument(byte);
byte = withByteResult2(byte);
byte = withByteResult2(i & 0xFF);
byte = withByteResult3({set: function($v){byte = $v;}, get: function(){return byte;}});
}();
