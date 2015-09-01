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
}();
