Here are additions to orginal oberon grammar to make it less strict in some cases.

### Optional procedure identifier at the end
Example:

    PROCEDURE p; END; (* 'p' is note required before 'END' *)

Pocedure name duplicating at the end is useless in case of small procedures. So it is optional in [[Eberon|eberon]].

### Extra semicolon can be used in record last field declaration
Example:

    TYPE 
        T = RECORD 
            field1: INTEGER; 
            field2: INTEGER; 
            fieldn: INTEGER; (* semocolon is allowed here in Eberon, prohibited by original oberon grammar *)
        END;

Although this semicolon is "extra" from grammar standpoint it just inconvenient from editing/merge standpoint. So [[Eberon|eberon]] allows to have it.

### Extra semicolon can be used after RETURN
Example:
    
    PROCEDURE p(): INTEGER; 
        RETURN 0; (* semocolon is allowed here in Eberon, prohibited by original oberon grammar *)
    END;

Although RETURN is not a statement from oberon grammar standpoint (it is a part of procedure declaration) it still looks and feels like a statement. So [[Eberon|eberon]] allows to have extra semicolon after it.
