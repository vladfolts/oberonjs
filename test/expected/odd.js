<rtl code>
var m = function (){
var i = 0;
RTL$.assert(1 & 1);
i = 4;
RTL$.assert((1 + i | 0) & 1);
RTL$.assert(!(2 & 1));
RTL$.assert((true || false ? 1 : 0) & 1);
}();
