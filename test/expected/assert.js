var RTL$ = {
    assert: function (condition, code){
        if (!condition)
            throw new Error("assertion failed"
                          + ((code !== undefined) ? " with code " + code : ""));
    }
};
var m = function (){
RTL$.assert(true);
RTL$.assert(true, 123);
}();