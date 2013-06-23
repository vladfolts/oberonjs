var m = function (){
var b1 = false;
var i1 = 0;
if (true){
	b1 = true;
}
if (b1){
	i1 = 0;
}
else {
	i1 = 1;
}
if (b1){
	i1 = 0;
}
else if (false){
	i1 = 1;
}
else {
	i1 = 2;
}
if (b1){
	if (b1){
		i1 = 0;
		b1 = false;
	}
}
else {
	b1 = true;
}
if (i1 == 1 || i1 == 2){
	b1 = true;
}
}();