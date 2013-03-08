var m = function (){
var b1 = false;var b2 = false;
var i1 = 0;
b1 = true;
b2 = false;
do {
	i1 = 0;
} while (b1);
do {
	i1 = 1;
	b2 = false;
} while (b1);
}();