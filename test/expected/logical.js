var m = function (){
var b1 = false;var b2 = false;
b1 = true;
b2 = b1 || b1;
b1 = b1 && b2;
b1 = !b2;
b1 = b1 && b2 || !b1;
}();