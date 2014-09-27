*JS* is a built-in pseudo module. It serves as a bridge to JavaScript world from oberon program. The major purpose of this module is to make possible to write bindings to JavaScript libraries.

    MODULE test;
    IMPORT JS;
    BEGIN
        JS.alert("Hello, World!")
    END test.

You can call any JavaScript function (from global scope) using notation "JS.anyName" and pass any number of any arguments to it. Compiler will not check anything - these are JavaScript rules, all type errors will be raised in runtime.

### JS.do

*JS.do* is a predefined procedure to place specified JavaScript code directly to compiler output.

    JS.do("throw new Error('test')");

### JS.var

*JS.var* is a type to explicit declaration of variables specific for JavaScript code.

    VAR v: JS.var;
    ...
    v := JS.someFunction();