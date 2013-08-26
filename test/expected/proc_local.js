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
    }
};
var m = function (){

function p1(arg1/*INTEGER*/){
	var T1 = RTL$.extend({
		init: function T1(){
			this.field1 = 0;
		}
	});
	var i1 = 0;var j1 = 0;
	var t1 = new T1();
	
	function p2(arg2/*BOOLEAN*/){
		var T2 = RTL$.extend({
			init: function T2(){
				this.field2 = false;
			}
		});
		var b = false;
		var t2 = new T2();
		b = arg2;
		t1.field1 = i1;
		t2.field2 = b;
	}
	p2(true);
	p2(false);
}
}();
