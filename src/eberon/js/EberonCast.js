var Cast = require("js/Cast.js");
var EberonString = require("js/EberonString.js");
var Types = require("js/Types.js");

function implicit(from/*PType*/, to/*PType*/, toVar/*BOOLEAN*/, ops/*Operations*/, op/*VAR PCastOp*/){
	var result = 0;
	if (from == EberonString.string() && Types.isString(to)){
		if (toVar){
			result = Cast.errVarParameter;
		}
		else {
			result = Cast.errNo;
		}
	}
	else {
		result = Cast.implicit(from, to, toVar, ops, op);
	}
	return result;
}
exports.implicit = implicit;
