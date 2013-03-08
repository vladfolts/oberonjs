var m = function (){
var b1 = false;var b2 = false;
var i1 = 0;
b1 = true;
b2 = false;
while (true){
	if (b1){
		i1 = 0;
	} else break;
}
while (true){
	if (b1){
		i1 = 0;
	}
	else if (b2){
		i1 = 1;
	} else break;
}
while (true){
	if (b1){
		while (true){
			if (b2){
				i1 = 1;
			}
			else if (b1){
				i1 = 2;
			} else break;
		}
	} else break;
}
}();