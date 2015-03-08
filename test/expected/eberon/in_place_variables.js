<rtl code>
var m = function (){
function Base(){
}
function Derived(){
	Base.call(this);
	this.derivedField = 0;
}
RTL$.extend(Derived, Base);
var r = new Derived();
var pbVar = null;
var pdVar = null;
var i = 0;
var a = RTL$.makeArray(10, 0);

function p(){
	return false;
}

function void$(){
}

function valueArgs(r/*Derived*/, i/*INTEGER*/, a/*ARRAY 10 OF INTEGER*/){
	var v1 = RTL$.clone(r, {record: {derivedField: null}});
	var v2 = i;
	var v3 = a.slice();
}

function varArgs(r/*VAR Derived*/, i/*VAR INTEGER*/, a/*ARRAY 10 OF INTEGER*/){
	var v1 = RTL$.clone(r, {record: {derivedField: null}});
	var v2 = i.get();
	var v3 = a.slice();
}

function pChar(c/*CHAR*/){
}

function pCharArray(a/*ARRAY OF CHAR*/){
}

function pString(s/*STRING*/){
}
var v1 = 0;
var v2 = 1.23;
var v3 = "abc";
var vs = "\"";
pChar(vs.charCodeAt(0));
pChar(34);
pCharArray(vs);
pString(vs);
var v4 = true;
var v5 = i;
var v6 = i + i | 0;
var v7 = p();
var v8 = void$;
var do$ = 0;
var tempRecord = RTL$.clone(r, {record: {derivedField: null}});
var tempArray = a.slice();
pdVar = new Derived();
pbVar = pdVar;
var pb = pbVar;
if (pb instanceof Derived){
	pb.derivedField = 123;
}
RTL$.assert(!(pb instanceof Derived) || pb.derivedField == 123);
for (var j = 0; j <= 10; ++j){
}
}();
