Methods are introduced to support OOP polymorphism for a data type (RECORD in case of oberon). Wirth suggests to achieve such polymorphism using procedure fields. This approach is not reliable nor efficient, also it produces a lot of garbage code. So Eberon supports methods natively.

### Syntax
Methods are declared similary to record fields. Original oberon record declaration modified to:

    RecordType = RECORD ["(" BaseType ")"] [FieldListSequence] END.
    FieldListSequence = FieldList {";" FieldList}.
    FieldList = MethodHeading | (IdentList ":" type).

*MethodHeading* is a new syntax for methods declaration:

    MethodHeading = PROCEDURE identdef [formalParameters].

Example:

    Figure = RECORD
        PROCEDURE draw(color: INTEGER)
    END;

Declared methods may be defined later using the same syntax as for ordinary procedures but having type name as a prefix to method name:

    ProcedureDeclaration = ProcedureHeading ";" ProcedureBody ident ["." ident].
    ProcedureHeading = PROCEDURE [ident "."] identdef [FormalParameters].

Example:

    PROCEDURE Figure.draw(color: INTEGER);
    END Figure.draw;

New keywords **SELF** and **SUPER** were introduced to reference record instance in method definition and to call base type method.

Example:

    Triangle = RECORD(Figure)
        border: BOOLEAN
    END;

    PROCEDURE Triangle.draw(color: INTEGER);
    BEGIN
        SUPER(color);

        IF SELF.border THEN
            drawTriangleBorder(SELF);
        END;
    END Triangle.draw;


### Semantics
Methods semantics basically the same as in popular OOP languages (Java, C#, C++).

Each particular method is declared once (in RECORD declaration). Method declaration with the same name is not allowed in type extensions. Type extensions then can define this method in the way specific for a particular extension type. Method definition should:
* have the same signature as a method declaration
* be placed in the same scope (module or procedure) as the extension type declaration

Method definition may be missed for a particular type. In this case the type is *abstract*. Abstract type cannot be *instantiated* - variable of this type cannot be declared or pointer to this type allocated using NEW. Method should be defined at least once in inheritance chain for a type to be non-abstract.

SUPER cannot be used to call an abstract method.