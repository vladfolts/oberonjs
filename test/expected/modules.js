var m1 = function (){

function p(){
}
return {
	p: p
}
}();
var m2 = function (m1){
m1.p();
}(m1);
var m3 = function (m1, m2){
m2.p();
}(m2, m1);
