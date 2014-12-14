Original procedure NEW in Oberon is not always convenient to use - it requires already declared pointer variable:

    PROCEDURE make(): Pointer;
    VAR
        result: Pointer;
    BEGIN
        NEW(result);
        RETURN result;
    END;

Operator NEW in [[Eberon|eberon]] returns a pointer to created record. So code above could be rewritten in shorter form like:

    PROCEDURE make(): Pointer;
        RETURN NEW T();
    END;

Also operator NEW can be used to initialize a pointer variable to base record (while creating derived record):

    IF condtition1 THEN
        base := NEW Dervied1();
    ELSE
        base := NEW Derived2();
    END;

Operator NEW also can be used to create a record having constructor with parameters:

    r := NEW T(param1, param2);

Operator NEW from language grammar standpoint is a part of *designator* so it is possible to denote record fields right after creating:

    NEW T().field