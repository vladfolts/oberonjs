var m = function (){

function testPassNonVarArgumentAsVarToAnotherProcedure(i/*INTEGER*/){
	
	function test(i/*VAR INTEGER*/){
	}
	test({set: function($v){i = $v;}, get: function(){return i;}});
}
}();
