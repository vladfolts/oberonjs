Original Oberon-07 CASE with type guards has [[notorious loophole|Original-report-refinements#3-case-with-type-guards]]. *Implicit type narrowing* is introduced as alternative solution without possible type violation problem.

The idea of *implicit type narrowing* is to make the compiler smart enough to comprehend that type testing (using IS) and following IF branch or logical conjunction (&) in expression narrows just tested variable type. The same type narrowing happens in the inverse case: logical not (~) for IS operation and following ELSE branch or logical disjunction (OR). Also compiler should guarantee that tested variable is not modified after type narrowing so there is no loopholes to corrupt type system by chance. That guarantee is easy to reach in case of [[In Place Variables|eberon-in-place-variables]] because their scope is very local and they cannot be modified by local procedures. Type narrowing is also appling to procedure arguments because they [[cannot be modified|Eberon-non-VAR-arguments-are-read-only]]. So if the example will use *pb* variable as *in place* variable then it will be compiled without addition type casts:

    VAR
        pbVar: PBase;
    BEGIN
        pb <- pbVar;
        IF pb IS PDerived THEN
            pb.derivedField := 123;
        END;

        ASSERT(~(pb IS PDerived) OR (pb.derivedField = 123));
    END.

Type narrowing is also applies to [[Ternary operator|eberon-ternary-operator]], WHILE statement and its ELSIF branches.

### Generic Message Bus
*Implicit type narrowing* is also used for VAR arguments to support generic message bus pattern.

    TYPE
        Message = RECORD END;
        Derived1 = RECORD (Message) derivedField1: BOOLEAN END;
        Derived2 = RECORD (Message) derivedField2: BOOLEAN END;

    PROCEDURE handleMessage(VAR msg: Message);
    BEGIN
        IF msg IS Derived1 THEN
            ASSERT(msg.derivedField1);
        ELSIF msg IS Derived2 THEN
            ASSERT(msg.derivedField2);
        END;
    END handleMessage;        