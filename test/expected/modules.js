var m1 = function (){

function p(){
}
return {
	p: p
}
}();
var m2 = function (){
m1.p();
}();
