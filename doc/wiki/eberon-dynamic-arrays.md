Dynamic arrays are similar to static arrays but their length can be changed at runtime - new elements can be added or removed.

### Syntax
Dynamic arrays are declared in the same way as static arrays - 'dynamic' dimension is marked with '*':
    
    a1: ARRAY * OF INTEGER;
    a2: ARRAY *, * OF BOOLEAN;
    a3: ARRAY *, 10, * OF CHAR;

### Semantics
Initial length of dynamic array is 0.
To add a new element *add* method is used:

    array.add(value);

Added _value_ type should be compatible with the array elements type. 
To remove element from array *remove* method is used:

    array.remove(index);

INTEGER _index_ specifies element index to remove.
Method *clear* is used to remove all elements from array:

    array.clear();

Dynamic arrays also have [[indexOf|eberon-array-methods]] method (similar to static arrays).

* Dynamic array can be passed as open array to procedure.
* Procedure can have dynamic array as VAR parameter and change content of passed array. But dynamic array cannot be passed as non-VAR paramater - ordinary open array should be used.
* Procedure can have dynamic array as a result - in this case a copy of array is returned.

Example:

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

* Dynamic array can be assigned to another dynamic array - destination array content is replaced by the content of source array, lenght became the same as the length of source array.
* Dynamic array can be assigned to open or static array but not vice versa.
* Element types should be compatible for all array assignment operations.
* Dynamic array cannot be assigned to NIL.