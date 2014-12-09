var RTL$ = {
    extend: function (cons, base){
        function Type(){}
        Type.prototype = base.prototype;
        cons.prototype = new Type();
        cons.prototype.constructor = cons;
    }
};
var m = function (){
function DerivedRecordWithParamConstructorWithoutConstructor(){
	RecordWithParamConstructor.apply(this, arguments);
}
RTL$.extend(DerivedRecordWithParamConstructorWithoutConstructor, RecordWithParamConstructor);
function MixAutoAndManualInitFields(){
	this.iAuto = 0;
	this.iManual = 123;
	this.$rAuto = new T();
	this.$rManual = new RecordWithParamConstructor(345);
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
RTL$.extend(Derived, T);
function RecordWithField(){
	this.i = 0;
}
function RecordWithFieldDerived(){
	T.call(this);
}
RTL$.extend(RecordWithFieldDerived, T);

function passAsArgument(o/*T*/){
}
function RecordWithParamConstructor(a/*INTEGER*/){
}
function DerivedRecordWithParamConstructor(){
	RecordWithParamConstructor.call(this, 123);
}
RTL$.extend(DerivedRecordWithParamConstructor, RecordWithParamConstructor);
function InitializeField(){
	this.i = 123;
}
function InitializeRecordField(){
	this.$r = new RecordWithParamConstructor(123);
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
