<rtl code>
var test = function (){

function array(){
	var a = RTL$.makeArray(3, false);
	var $seq1 = a;
	for(var i = 0; i < $seq1.length; ++i){
		var v = $seq1[i];
		RTL$.assert(a[i] == v);
	}
}

function arrayWithValueOnly(){
	var a = RTL$.makeArray(3, false);
	var $seq1 = a;
	for(var $key2 = 0; $key2 < $seq1.length; ++$key2){
		var v = $seq1[$key2];
		RTL$.assert(!v);
	}
}

function mapWithValueOnly(){
	var a = {};
	var $seq1 = a;
	for(var $key2 in $seq1){
		var v = $seq1[$key2];
		RTL$.assert(!v);
	}
}

function string(){
	var s = '';
	var $seq1 = s;
	for(var i = 0; i < $seq1.length; ++i){
		var c = $seq1.charCodeAt(i)
		RTL$.assert(s.charCodeAt(i) == c);
	}
	var $seq2 = s;
	for(var $key3 = 0; $key3 < $seq2.length; ++$key3){
		var c = $seq2.charCodeAt($key3)
		RTL$.assert(c != 0);
	}
}

function literal(){
	var $seq1 = "abc";
	for(var i = 0; i < $seq1.length; ++i){
		var c = $seq1.charCodeAt(i)
	}
	var $seq2 = "abc";
	for(var $key3 = 0; $key3 < $seq2.length; ++$key3){
		var c = $seq2.charCodeAt($key3)
		RTL$.assert(c != 0);
	}
	var $seq4 = "\"";
	for(var i = 0; i < $seq4.length; ++i){
		var c = $seq4.charCodeAt(i)
	}
	var $seq5 = "\"";
	for(var $key6 = 0; $key6 < $seq5.length; ++$key6){
		var c = $seq5.charCodeAt($key6)
	}
}
}();
