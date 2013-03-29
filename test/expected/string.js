var RTL$ = {
	makeArray: function RTLMakeArray(/*dimensions, initializer*/){
		var forward = Array.prototype.slice.call(arguments);
		var result = new Array(forward.shift());
		var i;
		if (forward.length == 1){
			var init = forward[0];
			if (typeof init == "function")
				for(i = 0; i < result.length; ++i)
					result[i] = init();
			else
				for(i = 0; i < result.length; ++i)
					result[i] = init;
		}
		else
			for(i = 0; i < result.length; ++i)
				result[i] = RTLMakeArray.apply(this, forward);
		return result;
	},
	assignArrayFromString: function RTLAssignArrayFromString(a, s){
		var i;
		for(i = 0; i < s.length; ++i)
			a[i] = s.charCodeAt(i);
		for(i = s.length; i < a.length; ++i)
			a[i] = 0;
	}
};
var m = function (){
var s1 = "\"";
var s2 = "ABC";
var s3 = "with space";
var a2 = RTL$.makeArray(3, 0);
RTL$.assignArrayFromString(a2, "\"");
RTL$.assignArrayFromString(a2, "ABC");
}();