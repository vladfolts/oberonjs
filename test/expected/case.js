var m = function (){
var ch1 = "a";
var constI = 12;
var i = 0;
var b1 = false;
var i1 = 0;
var c = 0;
var $c;
$c = i1;
$c = 123;
if ($c === 1){
	b1 = true;
}
$c = i1;
if ($c === 1){
	i = 2;
}
else if ($c === 2){
	i = 3;
	b1 = false;
}
$c = i1;
if ($c === 1){
	i = 2;
}
else if ($c === 2){
	i = 3;
	b1 = false;
}
$c = i1;
if ($c === 1 || $c === 2 || $c === 3){
	i = 4;
}
else if ($c === 12){
	i = constI;
}
else if (($c >= 4 && $c <= 5)){
	i = 5;
}
else if ($c === 6 || ($c >= 7 && $c <= 10)){
	b1 = true;
}
$c = c;
if ($c === 65){
	i = 1;
}
else if ($c === 97){
	i = 2;
}
else if ($c === 66 || $c === 67){
	i = 2;
}
else if (($c >= 68 && $c <= 70) || $c === 73 || $c === 74){
	i = 3;
}
else if (($c >= 75 && $c <= 90)){
	b1 = true;
}
}();