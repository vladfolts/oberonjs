var RTL$ = {
    assert: function (condition, code){
        if (!condition)
            throw new Error("assertion failed"
                          + ((code !== undefined) ? " with code " + code : ""));
    }
};
var m = function (){
var ch = 0;
var set = 0;
ch = 97;
RTL$.assert(ch == 97);
set = 2;
RTL$.assert(2 == set);
RTL$.assert((true ? 1 : 0) == 1);
RTL$.assert((false ? 1 : 0) == 0);
}();