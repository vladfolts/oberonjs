var m = function (){
var i = 0;
var r = 0;

function p(r/*VAR REAL*/, i/*VAR INTEGER*/){
	r.set(r.get() * Math.pow(2, i.get()));
	i.set((Math.log(r.get()) / Math.LN2) | 0); r.set(r.get() / Math.pow(2, i.get()));
}
r *= Math.pow(2, i);
i = (Math.log(r) / Math.LN2) | 0; r /= Math.pow(2, i);
}();