Original oberon does not allow to denote procedure call result if it returns pointer to record or procedure type. This restriction requires additional temporary variables and redundant code without visible profit. So **Eberon** gets rid of this restriction by changing original oberon grammar for _selector_.

### Syntax
    selector = "." ident | "[" ExpList "]" | "^" | "(" qualident ")" | ActualParameters.

Example:

    MODULE Test;
    TYPE 
        Proc = PROCEDURE;
        T = POINTER TO RECORD
            i: INTEGER
        END;

    PROCEDURE proc();
    END proc;

    PROCEDURE getProc(): Proc;
        RETURN proc
    END getProc;

    PROCEDURE getRecord(): T;
    VAR
        result: T;
    BEGIN
        NEW(result);
        RETURN result
    END getRecord;

    BEGIN
        getProc()(); (* OK in **Eberon**, error in original oberon *)
        getRecord().i := 123; (* OK in **Eberon**, error in original oberon *)
    END Test.