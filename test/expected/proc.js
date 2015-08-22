<rtl code>
var m = function (){
var i = 0;
var byte = 0;

function p1(arg1/*INTEGER*/){
	var $scope1 = $scope + ".p1";
	function T1(){
		this.field1 = 0;
	}
	function T2(){
		T1.call(this);
		this.field2 = false;
	}
	RTL$.extend(T2, T1, $scope1);
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

function inner1(){
	var $scope1 = $scope + ".inner1";
	
	function inner2(){
		var $scope2 = $scope1 + ".inner2";
		
		function inner3(){
			var $scope3 = $scope2 + ".inner3";
			function T(){
			}
		}
	}
	
	function inner22(){
		var $scope2 = $scope1 + ".inner22";
		function T(){
		}
	}
}
byte = withByteResult();
i = withByteResult();
withByteArgument(byte);
byte = withByteResult2(byte);
byte = withByteResult2(i & 0xFF);
byte = withByteResult3({set: function($v){byte = $v;}, get: function(){return byte;}});
}();
