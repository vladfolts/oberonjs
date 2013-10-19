var m = function (){
var ci = 123;
var p = null;
var vi = 0;

function p1(){
}
return {
	ci: ci,
	p: function(){return p;},
	vi: function(){return vi;},
	p1: p1
}
}();
