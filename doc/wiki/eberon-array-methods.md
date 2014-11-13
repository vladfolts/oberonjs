*indexOf* method is applied to array to search for specified element:

    elementIndex := array.indexOf(elementValueToSearch);

*indexOf* returns the index of the first element of array which value is equal to the value specified as the first argument. Its logic is equivalent to the following code:

    elementIndex := 0;
    WHILE (elementIndex < LEN(array)) & (array[elementIndex] # elementValueToSearch) DO
        INC(elementIndex)
    END;
    IF elementIndex = LEN(array) THEN
        elementIndex := -1
    END;

*indexOf* can be applied only if elements type can be used in relation operation, i.e. it cannot be applied to array of records or array of arrays.