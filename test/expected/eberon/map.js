var RTL$ = {
    assert: function (condition){
        if (!condition)
            throw new Error("assertion failed");
    }
};
var test = function (){
var m = {};

function ForEach(){
	for(var k in m){
		var v = m[k];
		RTL$.assert(v == 0);
		RTL$.assert(k != "");
	}
}
}();
