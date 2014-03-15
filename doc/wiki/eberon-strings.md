A new basic type STRING is introduced because oberon has nothing to deal with strings of arbitrary length. Any possible library solution will have a lot of syntax noise and have no chance to optimize trivial string operations. Oberon is not C++ with all these complex things (like operator overloading etc.) which make library solution viable so it is simplier to just support a new basic type on compiler level.

### Semantics
STRING is a basic type. It represents a sequence of characters of any length (including zero - empty string).
STRING is very similar to ARRAY OF CHAR:
* STRING can be indexed [] as CHAR
* predefined procedure LEN returns the length of STRING
* STRING can be compared
* STRING can be assigned from string literal
* STRING can be passed as open non-VAR ARRAY OF CHAR

But also there are differences:
* STRING content is read-only, it never modified
* ARRAY OF CHAR cannot be assigned to STRING or passed as STRING
* STRING can be returned as a result of procedure

STRING supports concatenation through '+' operator. Also '+' is supported for string literals:

Example:

    CONST constString = 22X + "abc" + 22X;
    VAR s: STRING;
    ...
    s := s + constString + s;

STRING [default value](/vladfolts/oberonjs/wiki/Original-report-refinements#2-variables-default-values) is empty string - "". STRING cannot be NIL.

All special cases described in original Wirth report regarding to ARRAY OF CHAR (comparing to other array types) seem not actual after introducing a separate type STRING to support strings but they are left as is in [Eberon](/vladfolts/oberonjs/wiki/eberon) to maintain compatibility with original oberon.