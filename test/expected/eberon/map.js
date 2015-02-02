var RTL$ = {
    makeArray: function (/*dimensions, initializer*/){
        var forward = Array.prototype.slice.call(arguments);
        var result = new Array(forward.shift());
        var i;
        if (forward.length == 1){
            var init = forward[0];
            if (typeof init == "function")
                for(i = 0; i < result.length; ++i)
                    result[i] = init();
            else
                for(i = 0; i < result.length; ++i)
                    result[i] = init;
        }
        else
            for(i = 0; i < result.length; ++i)
                result[i] = this.makeArray.apply(this, forward);
        return result;
    },
    cloneMapOfScalars: function (from){
        var result = {};
        this.copyMapOfScalars(from, result);
        return result;
    },
    copyMapOfScalars: function (from, to){
        this.clearMap(to);
        for(var k in from)
            to[k] = from[k];
    },
    clearMap: function (map){
        for(var p in map)
            delete map[p];
    },
    assert: function (condition){
        if (!condition)
            throw new Error("assertion failed");
    },
    makeCharArray: function (/*dimensions*/){
        var forward = Array.prototype.slice.call(arguments);
        var length = forward.pop();

        if (!forward.length)
            return this.__makeCharArray(length);

        function makeArray(){
            var forward = Array.prototype.slice.call(arguments);
            var result = new Array(forward.shift());
            var i;
            if (forward.length == 1){
                var init = forward[0];
                for(i = 0; i < result.length; ++i)
                    result[i] = init();
            }
            else
                for(i = 0; i < result.length; ++i)
                    result[i] = makeArray.apply(undefined, forward);
            return result;
        }

        forward.push(this.__makeCharArray.bind(this, length));
        return makeArray.apply(undefined, forward);
    },
    __makeCharArray: function (length){
        var result = new Uint16Array(length);
        this.__setupCharArrayMethods(result);
        return result;
    },
    __setupCharArrayMethods: function (a){
        var rtl = this;
        a.charCodeAt = function(i){return this[i];};
        a.slice = function(){
            var result = Array.prototype.slice.apply(this, arguments);
            rtl.__setupCharArrayMethods(result);
            return result;
        };
        a.toString = function(){
            return String.fromCharCode.apply(this, this);
        };
    },
    getMappedValue: function (map, key){
        if (!map.hasOwnProperty(key))
            throw new Error("invalid key: " + key);
        return map[key];
    },
    copyRecord: function (from, to){
        for(var prop in to){
            if (to.hasOwnProperty(prop)){
                var v = from[prop];
                var isScalar = prop[0] != "$";
                if (isScalar)
                    to[prop] = v;
                else
                    to[prop] = v instanceof Array ? this.cloneArrayOfRecords(v)
                                                  : this.cloneRecord(v);
            }
        }
    }
};
var test = function (){
var m = {};
function anonymous$1(){
	this.$m = {};
}
var r = new anonymous$1();
var a = RTL$.makeArray(1, {});
function RecordWithMapInitializedInConstructor(m/*MAP OF INTEGER*/){
	this.$m = RTL$.cloneMapOfScalars(m);
}

function ForEach(){
	var m = {};
	var $map1 = m;
	for(var k in $map1){
		var v = $map1[k];
		RTL$.assert(v == 0);
		RTL$.assert(k != "");
	}
}

function makeMap(){
	var m = {};
	return RTL$.cloneMapOfScalars(m);
}

function ForEachWithExpression(){
	var $map1 = makeMap();
	for(var k in $map1){
		var v = $map1[k];
	}
}

function NestedForEach(){
	var m = {};
	
	function inner(){
		var $map1 = m;
		for(var k in $map1){
			var v = $map1[k];
			var $map2 = m;
			for(var k2 in $map2){
				var v2 = $map2[k2];
			}
		}
	}
	var $map1 = m;
	for(var k in $map1){
		var v = $map1[k];
		var $map2 = m;
		for(var k2 in $map2){
			var v2 = $map2[k2];
		}
	}
	var $map3 = m;
	for(var k3 in $map3){
		var v3 = $map3[k3];
		var $map4 = m;
		for(var k in $map4){
			var v = $map4[k];
		}
	}
}

function put(){
	function T(){
		this.field = 0;
	}
	var m = {};
	var s = '';
	var a = RTL$.makeCharArray(3);
	var mapOfMap = {};
	var mapOfRecord = {};
	var mapOfPointer = {};
	m["a"] = 1;
	m["abc"] = 2;
	m[s] = 3;
	m[a] = 4;
	RTL$.getMappedValue(mapOfMap, "abc")["cde"] = 5;
	RTL$.getMappedValue(mapOfRecord, "abc").field = 6;
	RTL$.copyRecord(new T(), RTL$.getMappedValue(mapOfPointer, "abc"));
}

function in$(){
	var m = {};
	RTL$.assert(!Object.prototype.hasOwnProperty.call(m, "abc"));
}

function get(){
	var m = {};
	var s = '';
	var a = RTL$.makeCharArray(3);
	RTL$.assert(RTL$.getMappedValue(m, "a") == 1);
	RTL$.assert(RTL$.getMappedValue(m, "abc") == 2);
	RTL$.assert(RTL$.getMappedValue(m, s) == 3);
	RTL$.assert(RTL$.getMappedValue(m, a) == 4);
}

function remove(){
	var m = {};
	delete m["abc"];
}

function clear(){
	var m = {};
	RTL$.clearMap(m);
	RTL$.clearMap(m);
}

function returnLocalMap(){
	var result = {};
	return RTL$.cloneMapOfScalars(result);
}

function returnNonLocalMap(m/*MAP OF INTEGER*/){
	return RTL$.cloneMapOfScalars(m);
}

function assign(a/*MAP OF INTEGER*/){
	var v = {};
	RTL$.copyMapOfScalars(a, v);
	var v2 = RTL$.cloneMapOfScalars(a);
	var v3 = RTL$.cloneMapOfScalars(v2);
	var v4 = RTL$.cloneMapOfScalars(returnLocalMap());
	var v5 = RTL$.cloneMapOfScalars(returnNonLocalMap(v));
}

function passByRef(m/*VAR MAP OF INTEGER*/){
	m["abc"] = 123;
	RTL$.assert(Object.prototype.hasOwnProperty.call(m, "abc"));
}
var $map1 = m;
for(var k in $map1){
	var v = $map1[k];
	var $map2 = m;
	for(var k2 in $map2){
		var v2 = $map2[k2];
	}
}
passByRef(m);
passByRef(r.$m);
passByRef(a[0]);
}();
