Array initializers create array with specified elements as a shortcut instead of declaring array variable and initialize each element separately.

### Syntax

	"[" expression {, expression} "]"

### Example

	
	MODULE test;
	CONST a = [1, 2, 3];

	PROCEDURE passArray(a: ARRAY OF INTEGER);
	END;

	BEGIN
		passArray(a);
		passArray([123, 456]);
	END test.

### Semantics

* all expressions used in initializers list must have the same type
* if string literal is used as expression then element's type is [[STRING|eberon-strings]]
* array initializers can be used to define a constant in CONST section
* array initializers can be used wherever constant expression of corresponded array's type can be used 