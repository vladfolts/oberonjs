var RTL$ = {
    assert: function (condition, code){
        if (!condition)
            throw new Error("assertion failed"
                          + ((code !== undefined) ? " with code " + code : ""));
    }
};
var m = function (){
var i = 0;
RTL$.assert(1 & 1);
i = 4;
RTL$.assert(1 + i & 1);
RTL$.assert(!(2 & 1));
RTL$.assert((true || false ? 1 : 0) & 1);
}();