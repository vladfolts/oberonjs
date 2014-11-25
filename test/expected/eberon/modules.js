var RTL$ = {
    extend: function (cons, base){
        function Type(){}
        Type.prototype = base.prototype;
        cons.prototype = new Type();
        cons.prototype.constructor = cons;
    }
};
var m1 = function (){
function Base(){
}
Base.prototype.p = function(){
}
return {
	Base: Base
}
}();
var m2 = function (m1){
function T(){
	m1.Base.call(this);
}
RTL$.extend(T, m1.Base);
T.prototype.p = function(){
	m1.Base.prototype.p.call(this);
}
}(m1);
