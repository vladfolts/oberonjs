**Record Constructor** is a procedure associated with a record and invoked every time when an instance of record is instantiated. Being invoked automatically constructor is a unified way to initialize record and maintain record's invariant.

### Declaration
Constructor is declared as a record [[method|eberon-methods]] with the same name as the record type name:

    T = RECORD
        PROCEDURE T(); (* this is constructor declaration for record 'T' *)
    END;

    PROCEDURE T.T();
    (* this is constructor definition *)
    END;

Constructor cannot have result type specified.

### Parameters
Constructor can have parameters:

    T = RECORD
        PROCEDURE T(param1: INTEGER, param2: BOOLEAN);
    END;

Records having constructor with parameters cannot be declared in VAR section or pointers to such records cannot be passed to *procedure NEW*. [[In place variables|eberon-in-place-variables]] or [[operator NEW|eberon-operator-NEW]] must be used instead. Also such records cannot be used as elements of static arrays - use [[dynamic arrays|eberon-dynamic-arrays]] instead.

### Call constructor as an expression
Constructor can be called as an ordinary procedure by its name. Call result type is the type of constructed record:

    record <- T(123, TRUE); (* initialize in place variable 'record' with instance of 'T' *)

    NEW T(123, TRUE); (* construct pointer to 'T' using operator NEW *)

    do(T()); (* pass instance of 'T' to procedure 'do' *)

    T().field; (* construct instance of record 'T' and designate its field 'field' *)

### Type extension
Constructor parameters are inherited from base type to derived:

    Base = RECORD
        PROCEDURE Base(param: INTEGER);
    END;

    Derived = RECORD(Base)
    END;

Here constructor was not declared for 'Derived' but it was inherited from 'Base' so 'Derived' now can be constructed only using the same parameters as for constructing 'Base':

    Derived(123);

### Initialization list
Special syntax is introduced to call base constructor and to initialize fields having their own parameterized constructors:

    InitList = "|" ("SUPER" ActualParameters fields) | (InitField fields))
    fields = {"," InitField}
    InitField = ident ActualParameters

Consider following example:

    Base = RECORD
        PROCEDURE Base(param: INTEGER);
    END;

    Derived = RECORD(Base)
        PROCEDURE Derived();
    END;

Constructor 'Derived' has no parameters and 'Base' does have. To pass actual parameters to base constructor *SUPER* is used in initialization list:

    PROCEDURE Derived.Derived() | SUPER(123); (* call base constructor with parameter '123' *)
    END;

Similar thing is for fields having parameterized constructors:


    Field = RECORD 
        PROCEDURE Field(a: INTEGER);
    END;

    T = RECORD
        PROCEDURE T();

        f: Field;
    END;
              
    PROCEDURE T.T() | f(123); (* pass '123' to constructor of record's field 'f' *)
    END;

Fields of non-record types also can be referenced in initialization list. In this case field will be assigned to single actual parameter:

    T = RECORD
        PROCEDURE T();

        f1: INTEGER;
        f2: BOOLEAN;
    END;
              
    PROCEDURE T.T() | f1(123), f2(TRUE);
    END;

Fields must be referenced in the initializtion list in the same order as they declared in record. For example above "f2(TRUE), f1(123)" will cause compiler error. Fields of non-record types may be missed in the list - in this case they will be initialized using default values. Record fields having constructor without parameters will be initialized automatically and must be not referenced in initialzation list. All fields are initialized strictly in the same order as they declared in record - no matter if they referenced in the initialization list or initialized automatically. It is possible to use *SELF* in initialization list but be aware of the initialization order - do not use *SELF* to access not initialized field (the compiler does not diagnose that).

The order of execution in constructor: 
* call base constructor (if present), using *SUPER* (with parameters) or automatically (no parameters)
* initialize fields strictly in order from record declaration (mixing default values or supplied parameters in the initialization list)
* execute constructor body (BEGIN/END section)

Example:

    Base = RECORD
        PROCEDURE Base(param: INTEGER);
    END;

    Field1 = RECORD 
        PROCEDURE Field1(a: INTEGER);
    END;

    Field2 = RECORD 
        PROCEDURE Field2();
    END;

    Field3 = RECORD 
    END;

    T = RECORD
        int: INTEGER;
        field1: Field1;
        field2: Field2;
        field3: Field3;
        bool: BOOLEAN;
        set: SET;
    END;

    PROCEDURE T.T() | SUPER(123), field1(SELF.int), bool(TRUE);
    BEGIN
        ASSERT(SELF.bool);
    END;

Execution order for example above will be:
* call Base(123) 
* initialize field 'int' with default value '0' - automatically
* initialize field 'field1' by calling Field1(SELF.int)
* initialize field 'field2' by calling Field2() - automatically
* initialize field 'field3' (without constructor) - automatically
* initialize field 'bool' with TRUE
* initialize field 'set' with default value '{}' - automatically

### Export
Constructor can be exported using '*' notation

    T* = RECORD
        PROCEDURE T*();
    END;

If constructor is exported then the record itself must be exported too.
If constructor is not exported then record cannot be instantiated in other modules.