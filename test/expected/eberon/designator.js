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
var m = function (){
var TP = RTL$.extend({
	init: function TP(){
		this.i = 0;
		this.proc = null;
		this.procT = null;
	}
});

function proc(){
}

function makeT(){
	var result = null;
	result = new TP();
	result.proc = proc;
	result.procT = makeT;
	return result;
}

function makeProc(){
	return proc;
}

function int(i/*INTEGER*/){
}

function intVar(i/*VAR INTEGER*/){
}
int(makeT().i);
intVar(RTL$.makeRef(makeT(), "i"));
intVar(RTL$.makeRef(makeT().procT(), "i"));
makeT().proc();
makeT().proc();
makeT().procT().proc();
makeT().procT().proc();
makeProc()();
}();
