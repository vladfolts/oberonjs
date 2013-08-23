var RTL$ = {
    extend: function extend(methods){
        methods.__proto__ = this.prototype; // make instanceof work

        // to see constructor name in diagnostic
        var result = methods.init;
        methods.constructor = result.prototype.constructor;

        result.prototype = methods;
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
var anonymous$1$base = RTL$.extend({
	init: function anonymous$1$base(){
		this.i = 0;
	}
});
var pr = null;

function p(){
}
pr = new anonymous$1$base();
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
