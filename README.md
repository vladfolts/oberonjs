# Oberon 07 compiler

Translates Oberon to JavaScript code ready to be run in web browser or nodejs. Compiler itself is written in Oberon (with [extensions](https://github.com/vladfolts/oberonjs/wiki/Eberon)) and compiled to JavaScript. The compiler supports both "pure" and "plus extensions" mode. Pure mode is a strict implementation of original [Oberon language report](https://online.oberon.org/oberon).

## Quick start
You can try the compiler online [here](https://online.oberon.org).

To build it locally run "./build.py html". It will make _out/os.js and _out/oberonjs.html. Open oberonjs.html in the browser and try the compiler!

