var RTL$ = {
    makeArray: function (/*dimensions, initializer*/){
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
                result[i] = this.makeArray.apply(this, forward);
        return result;
    }
};
var Blur = function (){
var W = 640;
var W1 = 640 - 3;
var H = 480;
var H1 = 480 - 3;
var N = 13;
var Frames = 1;
var a = RTL$.makeArray(1920, 480, 0);var b = RTL$.makeArray(1920, 480, 0);
var time = 0;

function Blur2DArray(){
	var f = 0;var n = 0;
	var x = 0;var y = 0;
	var color = 0;
	for (f = 1; f <= Frames; ++f){
		for (n = 1; n <= N; ++n){
			for (y = 1; y <= H - 2; ++y){
				for (x = 1; x <= W - 2; ++x){
					for (color = 0; color <= 2; ++color){
						b[x * 3 + color][y] = (a[x * 3 + color][y + 1] + a[x * 3 + color][y - 1] + a[(x - 1) * 3][y] + a[(x + 1) * 3][y]) / 4 | 0;
					}
				}
			}
			for (y = 1; y <= H - 2; ++y){
				for (x = 1; x <= W - 2; ++x){
					for (color = 0; color <= 2; ++color){
						a[x * 3 + color][y] = (b[x * 3 + color][y + 1] + b[x * 3 + color][y - 1] + b[(x - 1) * 3][y] + b[(x + 1) * 3][y]) / 4 | 0;
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