var RTL$ = {
    assert: function (condition){
        if (!condition)
            throw new Error("assertion failed");
    },
    makeCharArray: function (/*dimensions*/){
        var forward = Array.prototype.slice.call(arguments);
        var length = forward.pop();

        if (!forward.length)
            return this.__makeCharArray(length);

        function makeArray(){
            var forward = Array.prototype.slice.call(arguments);
            var result = new Array(forward.shift());
            var i;
            if (forward.length == 1){
                var init = forward[0];
                for(i = 0; i < result.length; ++i)
                    result[i] = init();
            }
            else
                for(i = 0; i < result.length; ++i)
                    result[i] = makeArray.apply(undefined, forward);
            return result;
        }

        forward.push(this.__makeCharArray.bind(this, length));
        return makeArray.apply(undefined, forward);
    },
    __makeCharArray: function (length){
        var result = new Uint16Array(length);
        this.__setupCharArrayMethods(result);
        return result;
    },
    __setupCharArrayMethods: function (a){
        var rtl = this;
        a.charCodeAt = function(i){return this[i];};
        a.slice = function(){
            var result = Array.prototype.slice.apply(this, arguments);
            rtl.__setupCharArrayMethods(result);
            return result;
        };
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

function put(){
	var s = '';
	var a = RTL$.makeCharArray(3);
	m["a"] = 1;
	m["abc"] = 2;
	m[s] = 3;
	m[a] = 4;
}
}();
