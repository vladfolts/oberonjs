CodeMirror.defineMode("oberon07", function() {
/**
 * Possible styles:
 *
 * keyword   * atom        * number      * def
 * variable  * variable-2  * variable-3  * property
 * operator  * comment     * string      * string-2
 * meta      * error       * qualifier   * builtin
 * bracket   * tag         * attribute   * header
 * quote     * hr          * link
 *
 * OR & ~ < logic operator
 * + - * / DIV MOD < arithmetic operator
 * = # < > IS IN < relation operator
 */

    var DEF = 'def',
        ATOM = 'atom',
        CHAR = 'string-2',
        META = 'meta',
        IDENT = 'variable',
        ERROR = 'error',
        STRING = 'string',
        COMMENT = 'comment',
        BRACKET = 'bracket',
        KEYWORD = 'keyword',
        OPERATOR = 'operator',
        QUALIFIER = 'qualifier',

        _words = {
            'ABS' : DEF, 'ASR'  : DEF, 'ASSERT': DEF,
            'CHR' : DEF, 'COPY' : DEF, 'DEC'   : DEF,
            'EXCL': DEF, 'FLOOR': DEF, 'FLT'   : DEF,
            'INC' : DEF, 'INCL' : DEF, 'LEN'   : DEF,
            'LSL' : DEF, 'LONG' : DEF, 'NEW'   : DEF,
            'ODD' : DEF, 'ORD'  : DEF, 'PACK'  : DEF,
            'ROR' : DEF, 'SHORT': DEF, 'UNPK'  : DEF,

            'BOOLEAN' : ATOM, 'CHAR': ATOM, 'INTEGER': ATOM,
            'LONGREAL': ATOM, 'REAL': ATOM, 'SET'    : ATOM,

            'ADR': META, 'SIZE': META, 'BIT': META,
            'GET': META, 'PUT' : META,

            'ARRAY'    : KEYWORD, 'BEGIN'    : KEYWORD,
            'BY'       : KEYWORD, 'CASE'     : KEYWORD,
            'CONST'    : KEYWORD, 'DO'       : KEYWORD,
            'ELSE'     : KEYWORD, 'ELSIF'    : KEYWORD,
            'END'      : KEYWORD, 'FALSE'    : KEYWORD,
            'FOR'      : KEYWORD, 'IF'       : KEYWORD,
            'IMPORT'   : KEYWORD, 'MODULE'   : KEYWORD,
            'NIL'      : KEYWORD, 'OF'       : KEYWORD,
            'POINTER'  : KEYWORD, 'PROCEDURE': KEYWORD,
            'RECORD'   : KEYWORD, 'REPEAT'   : KEYWORD,
            'RETURN'   : KEYWORD, 'THEN'     : KEYWORD,
            'TO'       : KEYWORD, 'TRUE'     : KEYWORD,
            'TYPE'     : KEYWORD, 'UNTIL'    : KEYWORD,
            'VAR'      : KEYWORD, 'WHILE'    : KEYWORD,

            'DIV': OPERATOR, 'IN' : OPERATOR, 'IS' : OPERATOR,
            'MOD': OPERATOR, 'OR' : OPERATOR
        };

        _alphaREX = /[a-zA-Z_]/,
        _alphaDigitREX = /[0-9a-zA-Z_]/,

        _isAlpha = function (ch) {
            return _alphaREX.test(ch);
        },

        _isAlphaOrDigit = function (ch) {
            return _alphaDigitREX.test(ch);
        },

        _startState = function () {
            return {
                stack: [],
                state: null,
                ch: null,
                scope: 0,
                level: 0,
                error: null,
                name: null,
            };
        },

        _token = function (stream, state) {
            var _state = state.state;

                _ident = function (sym) {
                    var _token = IDENT,
                        _str = sym,
                        _ch = stream.next();

                    while (_ch && _isAlphaOrDigit(_ch) && !stream.eol()) {
                        _str += _ch;
                        _ch = stream.next();
                    }

                    state.name = _str;
                    if (_ch === '.' || _ch === '[') {
                        _token = QUALIFIER;
                    }

                    if (_words[_str]) {
                        _token = _words[_str];
                    }

                    if (!stream.eol()) {
                        stream.backUp(1);
                    }

                    return _token;
                },

                _number = function () {},

                _string = function (sym) {
                    var _str,
                        _ch = stream.next();

                    while (_ch && _ch != sym && !stream.eol()) {
                        _str += _ch;
                        _ch = stream.next();
                    }
                    if (stream.eol()) {
                        state.error = 'string.not.close';
                        return ERROR;
                    }
                    state.name = _str;
                    return STRING;
                },

                _comment = function () {
                    var mode = '?',
                        _ch;

                    while (state.level > 0 && !stream.eol()) {
                        _ch = stream.next();
                        switch (_ch) {
                            case '(':
                                mode = '(';
                                break;

                            case '*':
                                if (mode === '(') {
                                    state.level += 1;
                                }
                                mode = '*';
                                break;

                            case ')':
                                if (mode === '*') {
                                    state.level -= 1;
                                }
                                mode = ')';
                                break;

                            default:
                                mode = '?';
                        }
                    }
                    return COMMENT;
                },

                _ch = stream.next();

            if (state.level > 0) {
                return _comment();
            }

            if (_isAlpha(_ch)) {
                return _ident(_ch);
            }

            switch (_ch) {
                case '"':
                case "'":
                    return _string(_ch);

                case '[':
                case ']':
                case '{':
                case '}':
                case ')':
                    return BRACKET;

                case '(':
                    if (stream.peek() === '*') {
                        state.level += 1;
                        return _comment();
                    }
                    return BRACKET;

                case ':':
                    if (stream.peek() === '=') {
                        _ch = stream.next();
                        return KEYWORD;
                    }
                    return OPERATOR;

                case '<':
                case '>':

                case '#':
                case '&':
                case '+':
                case '-':
                case '*':
                case '/':
                case '~':
                case '|':
                case '^':
                case ',':
                case ';':
                    return OPERATOR;
            }

            return null;
        };

  // Interface

    return {
        startState: _startState,
        token: _token,
        electricChars: null
    };

});

CodeMirror.defineMIME("text/x-oberon07", "oberon07");
