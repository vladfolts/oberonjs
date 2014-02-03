var RTL$ = {
    assert: function (condition){
        if (!condition)
            throw new Error("assertion failed");
    }
};
var m = function (){
var ch = 0;
var i = 0;
i = 65;
ch = i;
RTL$.assert(97 == 97);
}();