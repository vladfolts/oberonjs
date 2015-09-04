*FOR..IN* loop statement is used to iteratate through arrays, [[STRING|eberon-strings]]s and [[MAP|eberon-associative-arrays]]s. For arrays and strings all elements are iterated from the beginning to the end.

### Syntax

    FOR [key,] value IN array DO
        ...
    END;

_key_ is an optional variable standing for array/string's index (from 0 to LEN(_array_) - 1) or MAP's key. _key_ type is INTEGER for arrays and strings and [[STRING|eberon-strings]] for [[MAP|eberon-associative-arrays]]s.
_value_ is a variable standing for element's value.
These variables have no a separate declaration and their visibility scope is inside loop only. Also these variables are read-only - similar to non-VAR parameters.

### Example

    VAR
        a: ARRAY 3 OF BOOLEAN;
    BEGIN
        FOR i, v IN a DO
            ASSERT(a[i] = v);
        END;

        (* not using key here *)
        FOR v IN a DO
        END;
    END;

    VAR
        m: MAP OF INTEGER;
    BEGIN
        FOR k, v IN m DO
            ASSERT(v = 0);
            ASSERT(k # "");
        END;
    END;
