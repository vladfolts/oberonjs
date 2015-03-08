<rtl code>
var m = function (){
RTL$.extend(Derived, T);
RTL$.extend(RecordWithFieldDerived, T);
RTL$.extend(DerivedRecordWithParamConstructor, RecordWithParamConstructor);
RTL$.extend(DerivedRecordWithParamConstructorBaseWithNoParameters, T);
function DerivedRecordWithParamConstructorWithoutConstructor(){
	RecordWithParamConstructor.apply(this, arguments);
}
RTL$.extend(DerivedRecordWithParamConstructorWithoutConstructor, RecordWithParamConstructor);
function MixAutoAndManualInitFields(){
	this.iAuto = 0;
	this.iManual = 123;
	this.rAuto = new T();
	this.rManual = new RecordWithParamConstructor(345);
	this.setManual = 8;
	this.stringAuto = '';
}
function UsingSelfInFieldsInit(){
	this.i1 = 123;
	this.i2 = this.i1;
}
function FieldInitAndBody(){
	this.i = 1;
	this.i = 2;
}
function T(){
}
function Derived(){
	T.call(this);
}
function RecordWithField(){
	this.i = 0;
}
function RecordWithFieldDerived(){
	T.call(this);
}

function passAsArgument(o/*T*/){
}
function RecordWithParamConstructor(a/*INTEGER*/){
}
function DerivedRecordWithParamConstructor(){
	RecordWithParamConstructor.call(this, 123);
}
function DerivedRecordWithParamConstructorBaseWithNoParameters(a/*INTEGER*/){
	T.call(this);
}
function InitializeField(){
	this.i = 123;
}
function InitializeRecordField(){
	this.r = new RecordWithParamConstructor(123);
}
function InitializeMangledField(){
	this.constructor$ = 123;
	this.prototype$ = true;
}
passAsArgument(new T());
var r = new T();
var i = new RecordWithField().i;
var rParam = new RecordWithParamConstructor(123);
var derived = new DerivedRecordWithParamConstructorWithoutConstructor(123);
}();
