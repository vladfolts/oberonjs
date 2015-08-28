# Oberon 07 compiler

Translates Oberon to JavaScript code ready to be run in web browser or nodejs. Compiler itself is written in Oberon (with [extensions](https://github.com/vladfolts/oberonjs/wiki/Eberon)) and compiled to JavaScript. The compiler supports both "pure" and "plus extensions" mode. Pure mode is a strict implementation of original Oberon language report. Language [extensions](https://github.com/vladfolts/oberonjs/wiki/Eberon) implemented in my own way and available as a separate compiler mode.

## Quick start
You can try the compiler online [here](http://oberspace.dyndns.org/oberonjs.html).

To build it locally run "python build.py html" (Python 2.x or 3.x is required). It will make _out/os.js and _out/oberonjs.html. Open oberonjs.html in the browser and try the compiler!

