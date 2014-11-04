var RTL$ = {
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
var Blur = function (){
var W = 640;
var W1 = 640 - 3 | 0;
var H = 480;
var H1 = 480 - 3 | 0;
var N = 13;
var Frames = 1;
var a = RTL$.makeCharArray(1920, 480);var b = RTL$.makeCharArray(1920, 480);
var time = 0;

function Blur2DArray(){
	var f = 0;var n = 0;
	var x = 0;var y = 0;
	var color = 0;
	for (f = 1; f <= Frames; ++f){
		for (n = 1; n <= N; ++n){
			for (y = 1; y <= H - 2 | 0; ++y){
				for (x = 1; x <= W - 2 | 0; ++x){
					for (color = 0; color <= 2; ++color){
						b[(x * 3 | 0) + color | 0][y] = (((a[(x * 3 | 0) + color | 0].charCodeAt(y + 1 | 0) + a[(x * 3 | 0) + color | 0].charCodeAt(y - 1 | 0) | 0) + a[(x - 1 | 0) * 3 | 0].charCodeAt(y) | 0) + a[(x + 1 | 0) * 3 | 0].charCodeAt(y) | 0) / 4 | 0;
					}
				}
			}
			for (y = 1; y <= H - 2 | 0; ++y){
				for (x = 1; x <= W - 2 | 0; ++x){
					for (color = 0; color <= 2; ++color){
						a[(x * 3 | 0) + color | 0][y] = (((b[(x * 3 | 0) + color | 0].charCodeAt(y + 1 | 0) + b[(x * 3 | 0) + color | 0].charCodeAt(y - 1 | 0) | 0) + b[(x - 1 | 0) * 3 | 0].charCodeAt(y) | 0) + b[(x + 1 | 0) * 3 | 0].charCodeAt(y) | 0) / 4 | 0;
					}
				}
			}
		}
	}
}
Blur2DArray();
return {
	Blur2DArray: Blur2DArray
}
}();
