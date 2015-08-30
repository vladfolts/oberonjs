<rtl code>
var test = function (){

function array(){
	var a = RTL$.makeArray(3, false);
	var $seq1 = a;
	for(var i in $seq1){
		var v = $seq1[i];
		RTL$.assert(a[i] == v);
	}
}
}();
