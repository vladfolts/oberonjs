*In place* variables are introduced to relieve VAR section from variables which have very local scope or temporary nature. *In place* variable is declared and initialized in the same place where it is needed so there is no gap between its declaration and usage.

### Syntax
*In place* variable can be declared wherever the grammar *statement* is suitable:

    InPlaceStatement = ident "<-" expression

Example:

    i <- 123;

*In place* variable is declared and assigned in the same time. The type of variable is not specified but deduced from the expression on the right. In the example above 
variable will have type INTEGER. In the following example the variable will have the same type as a result of PROCEDURE f:

    x <- f();

Although the type is not specified explicitly a variable is still statically typed (its type cannot be changed) with deduced type in the same way as a regular variable (declared in VAR section).

*In place* variable behaves in the same way as a regular variable (declared in VAR section). It can be reassigned or passed as a VAR parameter to procedure. When variable is initialized with a record type - it will be copied as if variable of this record type was declared in VAR section and then assigned to another variable of record type. When variable is initialized with an array type - array will be copied. *In place* variable cannot be initialized with open array because its full type (including size) is unknown.

    PROCEDURE p(a1: SomeRecord; VAR a2: SomeRecord);
    BEGIN
        v1 <- a1; (* a1 will be copied to v1 *)
        v2 <- a2; (* a2 will be copied to v2 *)
    END p;

Please notice that *v1* and *v2* will be copies (modifiable) of variables of type SomeRecord even if some descendants of type SomeRecord were passed to the procedure *p* as actual parameters.

### Scope rules

*In place* variable is visible from the place of declaration textually down to the end of procedure or outer IF/WHILE/FOR's END or ELSE/ELSIF/CASE branch.

*In place* variable name cannot duplicate any other variable name from outer scopes up to procedure scope.

    PROCEDURE p();
    VAR v1: INTEGER;
    BEGIN
        v1 <- 1; (* compile error: 'v1' already declared in procedure scope *)
        v2 <- 2; (* OK *)
        IF expression THEN
            v2 <- 2; (* compile error: 'v2' already declared in procedure scope *)
            v3 <- 3; (* OK *)
        ELSE
            v3 <- 3; (* OK, another v3 is declared in separate scope *)
        END;

        v3 := 3; (* compile error: undeclared identifier: 'v3')
    END p;