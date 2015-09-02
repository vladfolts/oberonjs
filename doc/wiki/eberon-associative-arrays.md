Associative arrays are indexed by string keys. The basic operations on a such array is storing a value (having declared type) and extracting the value given the key (string).

### Syntax
Associative arrays are declared using keyword *MAP*:
    
    VAR m: MAP OF INTEGER; (* m is associative array storing integer values *)

    TYPE T = RECORD field: MAP OF T END; (* associative array can have records as values *)

### Semantics
Notation similar to ordinary arrays is used to acceess, add a new element or replace existing element (with the same key) in associative array:
    
    m[key] := value; (* add/replace element *)
    value := m[key]; (* get element *)

_key_ type should be compatible with [[STRING|eberon-strings]] and _value_ should be compatible with declared type. Attempt to access element with non-existing key will break program execution.

Keyword *IN* is used to test whether element with specified key is present in the array:
    
    IF key IN m THEN

It is also possible to iterate through associative array keys/values using [[FOR..IN|eberon-FOR..IN]] loop.
    
To remove element from array *remove* method is used:
    
    m.remove(key)

To remove all elements from array *clear* method is used:    

    m.clear()
