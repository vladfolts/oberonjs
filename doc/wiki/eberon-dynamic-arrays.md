Dynamic arrays are introduced because oberon has no option for dynamically grown sequences except linked lists (and linked lists are not efficient comparing to arrays in some cases).

### Syntax
Dynamic arrays are declared in the same way as oberon arrays - 'dynamic' dimension is marked with '*':
    
    a1: ARRAY * OF INTEGER;
    a2: ARRAY *, * OF BOOLEAN;
    a3: ARRAY *, 10, * OF CHAR;

### Semantics
Dynamic arrays are similar to static arrays but their length can be changed at runtime. Initial length is 0. To add a new element *add* method is used:

    array.add(value);

Added *value* type should be compatible with the array elements type. 
To remove element from array *remove* method is used:

    array.remove(index);

INTEGER *index* specifies element index to remove.
Method *clear* is used to remove all elements from array:

    array.clear();

Dynamic arrays also have [[indexOf|eberon-array-methods]] method (similar to static arrays).

Dynamic array can be passed as open array to procedure.
Procedure cannot have dynamic array as non-VAR parameter.
Procedure can have dynamic array as a result - in this case a copy of array is returned.

    MODULE Test;
    TYPE
        A = ARRAY * OF INTEGER;
    VAR
        a1, a2: A;
    
    PROCEDURE returnDynamicArray(VAR a: A): A;
        RETURN a
    END returnDynamicArray;

    BEGIN
        a1.add(3);
        a2 := returnDynamicArray(a1);
        ASSERT(LEN(a2) = 1);
        ASSERT(a2[0] = 3);

        a1[0] := 5;
        ASSERT(a2[0] = 3); (*array was copied, a1 and a2 do not share elements*)
    END Test.

Dynamic array can be assigned to open, static or another dynamic array but not vice versa. Element types should be compatible in this case.
Dynamic array cannot be assigned to NIL.