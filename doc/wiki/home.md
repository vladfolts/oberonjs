### The goal of the project
I could formulate the goal as "to have traditional static-typed language on the Web". But more realistically it is: to built my own compiler (never did it before but always wanted). Also I wanted to [[experiment|Eberon]] with my own language.

### Demo
You can try the compiler online [here](http://oberspace.dyndns.org/oberonjs.html). You can compile more than one module at a time: modules should be separated by spaces or new lines and imported modules should be placed before dependent ones. 

### How to use
You can use the project as any other JavaScript library. There is no third-party dependencies. The project has been developing using nodejs, you might need to accommodate nodejs source modules in your project if you want to use nodejs. All source code is under src/ folder. Compiler entry point is `oc.js`.

The repository contains pre-compiled JavaScriprt code of the compiler (ready to run) in .zip [archive](../../bin/compiled.zip). This code is needed to self-compile the compiler (from Oberon sources) for the first time.

Python 2.x or 3.x is required. [build.py](../../build.py) script is used as a helper for different tasks:
* build a test html page locally and see how it works
    ```
    ./build.py html
    ```
    this will create `_out/os.js` (glued nodejs modules) and `_out/oberonjs.html`. Open oberonjs.html in the browser and try the compiler!
* compile Oberon source file(s)
    ```
    ./build.py compile file.ob
    ```
See other functions with "./build.py --help".

### State of development
* Proof of concept: Oberon modules compile to JavaScript and can be executed in web browser.
* No SYSTEM module.
* All included tests are passing.
* Please report bugs or any deviations from language report.

### Implementation details
* [[JS module|JS-module]]
* [[Report refinements|Original-report-refinements]]
* [[Compiler options|compiler-options]]

### [[Experiments|Eberon]]
