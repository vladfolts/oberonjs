<rtl code>
var m1 = function (){
function Base(){
}
function Derived(){
	Base.call(this);
}
RTL$.extend(Derived, Base);
return {
	Base: Base,
	Derived: Derived
}
}();
var m2 = function (m1){
var b = new m1.Base();
var d = new m1.Derived();

function isDerived(b/*VAR Base*/){
	var result = false;
	var $case1 = b;
	if ($case1 instanceof m1.Derived){
		result = true;
	}
	return result;
}
RTL$.assert(!isDerived(b));
RTL$.assert(isDerived(d));
}(m1);
