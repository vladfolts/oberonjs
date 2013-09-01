var RTL$ = {
    extend: function extend(methods){
        function Type(){
            for(var m in methods)
                this[m] = methods[m];
        }
        Type.prototype = this.prototype;

        var result = methods.init;
        result.prototype = new Type(); // inherit this.prototype
        result.prototype.constructor = result; // to see constructor name in diagnostic
        
        result.extend = extend;
        return result;
    },
    makeRef: function (obj, prop){
        return {set: function(v){ obj[prop] = v; },
                get: function(){ return obj[prop]; }};
    }
};
var m1 = function (){
var ci = 123;
var i = 0;
var anonymous$1 = RTL$.extend({
	init: function anonymous$1(){
		this.i = 0;
	}
});
var pr = null;

function p(){
}
pr = new anonymous$1();
return {
	ci: ci,
	i: function(){return i;},
	pr: function(){return pr;},
	p: p
}
}();
var m2 = function (m1){

function p(i/*INTEGER*/){
}

function ref(i/*VAR INTEGER*/){
}
m1.p();
p(m1.i());
p(m1.ci);
ref(RTL$.makeRef(m1.pr(), "i"));
}(m1);
var m3 = function (m1, m2){
m2.p();
}(m2, m1);
