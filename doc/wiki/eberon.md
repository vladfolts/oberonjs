**Eberon** is Experimental oBERON. It is my attempt to make a programming language in the right way (in my humble opinion of cause) taking Wirth's Oberon as a start point.

Eberon basically extends original Oberon (excluding additional [restrictions](#restrictions) below) so any valid oberon program is also a valid eberon program. A new syntax was introduced for extensions but I tried to maintain the original syntax flavor (e.g. CAPS).

### Extensions
* [[Methods|eberon-methods]]
* [[Record Constructors|eberon-record-constructor]]
* [[Strings|eberon-strings]]
* [[In Place Variables|eberon-in-place-variables]]
* [[Implicit Type Narrowing|eberon-implicit-type-narrowing]]
* [[Dynamic Arrays|eberon-dynamic-arrays]]
* [[Associative Arrays|eberon-associative-arrays]]
* [[FOR..IN loop|eberon-FOR..IN]]
* [[Array initializers|eberon-array-initializers]]
* [[Array indexOf() method|eberon-array-methods]]
* [[Record fields read-only export|eberon-record-fields-read-only-export]]
* [[Procedure call result can be denoted|eberon-procedure-call-result]]
* [[Operator NEW|eberon-operator-NEW]]
* [[Ternary operator|eberon-ternary-operator]]
* [[Syntax relaxations|eberon-syntax-relaxations]]

### Restrictions
* [[Non-VAR arguments are read-only|eberon-non-VAR-arguments-are-read-only]]