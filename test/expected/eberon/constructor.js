var RTL$ = {
    extend: function (cons, base){
        function Type(){}
        Type.prototype = base.prototype;
        cons.prototype = new Type();
        cons.prototype.constructor = cons;
    }
};
var m = function (){
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
}();
