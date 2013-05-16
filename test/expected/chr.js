var RTL$ = {
    assert: function (condition, code){
        if (!condition)
            throw new Error("assertion failed"
                          + ((code !== undefined) ? " with code " + code : ""));
    }
};
var m = function (){
var ch = 0;
var i = 0;
i = 65;
ch = i;
RTL$.assert(97 == 97);
}();