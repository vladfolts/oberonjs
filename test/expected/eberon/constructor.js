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
}
RTL$.extend(Derived, T);
}();
