<rtl code>
var m = function (){
var ch1 = "a";
var constI = 12;
function Base(){
}
function Derived(){
	Base.call(this);
	this.i = 0;
}
RTL$.extend(Derived, Base);
function Derived2(){
	Base.call(this);
	this.i2 = 0;
}
RTL$.extend(Derived2, Base);
function T(){
	this.b = null;
}
var i = 0;
var b1 = false;
var i1 = 0;
var byte = 0;
var c = 0;

function caseIntByVar(i/*VAR INTEGER*/){
	var $case1 = i.get();
	if ($case1 === 1){
		i.set(1);
	}
}

function caseRef(p/*VAR Base*/){
	
	function passRef(p/*Derived*/){
	}
	
	function passRefVar(p/*VAR Derived2*/){
	}
	var $case1 = p;
	if ($case1 instanceof Derived){
		passRef(p);
	}
	else if ($case1 instanceof Derived2){
		passRefVar(p);
	}
}

function casePointer(p/*PBase*/){
	
	function passRef(p/*Derived*/){
	}
	
	function passRefVar(p/*VAR Derived2*/){
	}
	if (p instanceof Derived){
		passRef(p);
	}
	else if (p instanceof Derived2){
		passRefVar(p);
	}
	if (p instanceof Derived){
		p.i = 0;
	}
	if (p instanceof Derived){
		p.i = 0;
	}
	else if (p instanceof Derived2){
		p.i2 = 0;
	}
}

function caseExpression(r/*T*/){
	var $case1 = r.b;
	if ($case1 instanceof Derived){
	}
	else if ($case1 instanceof Derived2){
	}
}

function casePointerDereference(p/*PBase*/){
	var $case1 = p;
	if ($case1 instanceof Derived){
	}
	else if ($case1 instanceof Derived2){
	}
}

function casePointerByVar(p/*VAR PBase*/){
	var $case1 = p.get();
	if ($case1 instanceof Derived){
	}
	else if ($case1 instanceof Derived2){
	}
}
if (i1 === 1){
	b1 = false;
}
var $case1 = 123;
if ($case1 === 1){
	b1 = true;
}
if (i1 === 1){
	i = 2;
}
else if (i1 === 2){
	i = 3;
	b1 = false;
}
if (i1 === 1){
	i = 2;
}
else if (i1 === 2){
	i = 3;
	b1 = false;
}
if (i1 === 1 || i1 === 2 || i1 === 3){
	i = 4;
}
else if (i1 === 12){
	i = constI;
}
else if ((i1 >= 4 && i1 <= 5)){
	i = 5;
}
else if (i1 === 6 || (i1 >= 7 && i1 <= 10)){
	b1 = true;
}
if (byte === 1){
	i = 2;
}
else if (byte === 257){
	i = 3;
}
else if ((byte >= 4 && byte <= 12)){
	i = 5;
}
if (c === 65){
	i = 1;
}
else if (c === 97){
	i = 2;
}
else if (c === 66 || c === 67){
	i = 2;
}
else if ((c >= 68 && c <= 70) || c === 73 || c === 74){
	i = 3;
}
else if ((c >= 75 && c <= 90)){
	b1 = true;
}
var $case2 = 97;
if ($case2 === 65){
	i = 1;
}
var $case3 = 65;
if ($case3 === 97){
	i = 1;
}
var $case4 = constI;
if ($case4 === 1){
	i = 1;
}
var $case5 = 123;
if ($case5 === 1){
	i = 1;
}
}();
