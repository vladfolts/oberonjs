var m = function (){
var i = 0;
var b1 = false;
var i1 = 0;
for (i = 0; i <= 10; ++i){
	i1 = i1 + 1;
}
for (i = 0; i <= 10; i += 5){
	b1 = true;
}
for (i = 15; i >= 0; i -= 3){
	for (i1 = 1; i1 >= 3; i1 -= 1){
		b1 = true;
	}
	i1 = -2;
}
}();