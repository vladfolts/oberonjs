Read-only export is introduced for record fields using '-' mark - in the same way as it is done in Component Pascal.
The major reason for this extension is to maintain data integrity without obligation to write down corresponfing procedures-accessors. I.e. instead of hiding (not exporting) record field and giving procedure-accessor (exported) for reading field value it is possble to just mark a field as exported for reading only.

### Syntax
    identdef = ident ["*" | "-"].

Example:

    MODULE m1;
    TYPE 
        T* = RECORD
            i-: INTEGER
        END;
        TP* = POINTER TO T;

        PROCEDURE make*(): TP;
        VAR result: TP;
        BEGIN
            NEW(result);
            result.i := 123; (* field 'T.i' can be modified in this module *)
            RETURN result
        END make;
    END m1.    

    MODULE m2;
    IMPORT m1;
    VAR p: m1.TP; 
    BEGIN
        p := m1.make();
        ASSERT(p.i = 123); (* field 'T.i' can be accessed in this module *) 
        p.i := 321; (* compiller error, 'T.i' cannot be modified in this module *)
    END m2.        