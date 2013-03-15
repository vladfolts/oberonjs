exports.ok = function(condition){
	if (!condition)
		throw new Error("assertion failed");
}