var RTL$ = {
    makeRef: function (obj, prop){
        return {set: function(v){ obj[prop] = v; },
                get: function(){ return obj[prop]; }};
    }
};
var m = function (){
function TP(){
	this.i = 0;
	this.proc = null;
	this.procT = null;
}

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
