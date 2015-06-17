"use strict";

var ContextHierarchy = require("js/ContextHierarchy.js");
var Class = require("rtl.js").Class;

var ChainedContext = ContextHierarchy.Node;
ChainedContext.extend = Class.extend;
ChainedContext.prototype.init = ContextHierarchy.Node;

exports.Chained = ChainedContext;
