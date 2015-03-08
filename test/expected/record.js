<rtl code>
var m = function (){
function Base1(){
}
function T1(){
	Base1.call(this);
	this.i = 0;
}
RTL$.extend(T1, Base1);
function RecordWithInnerRecord(){
	this.r = new T1();
}
function RecordWithInnerArray(){
	this.aInts = RTL$.makeArray(3, 0);
	this.aRecords = RTL$.makeArray(3, function(){return new T1();});
	this.aPointers = RTL$.makeArray(3, null);
}
function RecordWithMangledFields(){
	this.constructor$ = 0;
	this.prototype$ = false;
}
var b1 = new Base1();
var r1 = new T1();var r2 = new T1();
var recordWithInnerRecord = new RecordWithInnerRecord();
var recordWithInnerArray = new RecordWithInnerArray();
var recordWithMangledFields = new RecordWithMangledFields();

function p1(r/*T1*/){
}

function p2(r/*VAR T1*/){
	p1(r);
}

function byRef(i/*VAR INTEGER*/){
}
RTL$.copy(r1, b1, {record: {}});
RTL$.copy(r2, r1, {record: {i: null}});
RTL$.copy(recordWithInnerArray, recordWithInnerArray, {record: {aInts: {array: null}, aRecords: {array: {record: {i: null}}}, aPointers: {array: null}}});
p1(r1);
p2(r1);
recordWithInnerRecord.r.i = 123;
p1(recordWithInnerRecord.r);
p2(recordWithInnerRecord.r);
byRef(RTL$.makeRef(recordWithInnerRecord.r, "i"));
recordWithInnerArray.aInts[0] = 123;
recordWithInnerArray.aRecords[0].i = 123;
recordWithInnerArray.aPointers[0].i = 123;
RTL$.assert(recordWithMangledFields.constructor$ == 0);
RTL$.assert(!recordWithMangledFields.prototype$);
}();
