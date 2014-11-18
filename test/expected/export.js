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
var m = function (){
var ci = 123;
function T1(){
}
function NotExportedRecord(){
}
var pr1 = null;
var p2 = null;
var vi = 0;

function p1(){
}
return {
	ci: ci,
	T1: T1,
	PNotExportedRecord: NotExportedRecord,
	pr1: function(){return pr1;},
	p2: function(){return p2;},
	vi: function(){return vi;},
	p1: p1
}
}();
