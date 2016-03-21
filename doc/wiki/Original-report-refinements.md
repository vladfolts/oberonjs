Here are implemented refinements to the original language report (see doc/Oberon07.Report.pdf). 
* These refinements do not contradict to the original report.
* These refinements are not extensions of the original report because they do not extend syntax or language semantics.
* These refinements are not directly inherited from original report using "common sense".

However these refinements are crucial from programming techniques standpoint so they are worth to be documented explicitly.

1. Support opaque data types.
-----------------------------

Consider you want to encapsulate some data structure inner details. But you need this data to be passed to/from the module. You can do it in this manner:

    MODULE impl;

    TYPE T* = RECORD hiddenField: INTEGER END;

    PROCEDURE do(t: T);
    (* t.hiddenField can be accessed only in this module *)
    END do;

    END impl.

This example works just fine until you need some specific initialization for 'hiddenField'. And only module 'impl' knows how to initialize T in the right way. We can export special procedure for initialization:

    PROCEDURE init*(VAR t: T);
    BEGIN
        t.hiddenField := 123;
    END init;

All other modules have to call impl.init(t) every time they need to initialize T. But this requirement can be easily ignored leading to some run-time errors.

To resolve this problem we can export only pointer type and **forbid creation (NEW) for non-exported RECORD types**.
Full example:

    MODULE impl;

    TYPE T* = POINTER TO RECORD hiddenField: INTEGER END;

    PROCEDURE init*(): T;
    VAR result: T;
    BEGIN
    	NEW(result);
        result.hiddenField := 123;
    	RETURN result
    END init;

    PROCEDURE do*(t: T);
    (* t.hiddenField can be accessed only in this module *)
    END do;

    END impl.

    MODULE test;
    IMPORT impl;
    VAR p: impl.T;
    BEGIN
    	(* NEW(p) will produce complier error *)
    	p := impl.init();
    	impl.do(p);
    END test.

2. Variables default values
---------------------------
All variables have zero as a default value (before first assignment). For pointer/procedure types it is NIL. For sets - empty set. For STRING - empty string.

    MODULE m;
    VAR r: RECORD field: INTEGER END;
    BEGIN
        ASSERT(r.field = 0);
    END m.

3. CASE with type guards
------------------------
CASE with type guard has notorious loophole allowing to violate type system. Consider following example:

    MODULE test;
    TYPE
        Base = RECORD END; 
        Derived1 = POINTER TO RECORD(Base) derived1Field: INTEGER END;
        Derived2 = POINTER TO RECORD(Base) END;
    VAR p: POINTER TO Base; p1: Derived1; p2: Derived2;

    PROCEDURE assignToDerived2();
    BEGIN
        NEW(p2);
        p := p2;
    END assignToDerived2;

    PROCEDURE check();
    BEGIN
        CASE p OF
            Derived1: 
                assignToDerived2(); (* p is not Derived1 anymore *)
                p.derived1Field := 123; (* type system violation *)
        END;
    END check;

    BEGIN
        NEW(p1);
        p := p1;
        check();
    END test.

Oberonjs does not change the type of pointer passed as VAR argument in CASE to reduce most unexpected bugs (referenced pointer can be changed indirectly):

    PROCEDURE check(VAR p: PBase);
    BEGIN
        CASE p OF
            Derived1: 
                (* this code is compiled successfully but 'p' has type PBase here, not Derived1 *)
        END;
    END check;

I would recommend to use Eberon's [[implicit type narrowing|Eberon-implicit-type-narrowing]] instead of CASE with type guards - it is as efficient as CASE but does not have described problem. 