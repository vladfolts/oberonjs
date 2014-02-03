var RTL$ = {
    assert: function (condition){
        if (!condition)
            throw new Error("assertion failed");
    }
};
var m = function (){
RTL$.assert(true);
}();