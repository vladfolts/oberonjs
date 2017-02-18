<rtl code>
var import$ = function (){
function Math$(){
}
Math$.prototype.do = function(){
};
Math$.prototype.catch = function(){
};
return {
	Math: Math$
}
}();
var m = function (import$){
RTL$.extend(Object$, import$.Math);
RTL$.extend(Number$, Object$);
function Object$(var$/*INTEGER*/){
	import$.Math.call(this);
	this.var = var$;
}
Object$.prototype.catch = function(){
	import$.Math.prototype.catch.call(this);
};
Object$.prototype.throw = function(){
};
function Number$(){
	Object$.call(this, 123);
}
Number$.prototype.throw = function(){
	Object$.prototype.throw.call(this);
};
Number$.prototype.do = function(){
	Object$.prototype.do.call(this);
};
}(import$);
