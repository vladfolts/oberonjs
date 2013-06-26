CodeMirror.defineMode("oberon07", function () {

    var CSS_KEYWORD    = 'keyword',     CSS_ATOM       = 'atom',
        CSS_NUMBER     = 'number',      CSS_DEF        = 'def',
        CSS_VARIABLE   = 'variable',    CSS_VARIABLE_2 = 'variable-2',
        CSS_VARIABLE_3 = 'variable-3',  CSS_PROPERTY   = 'property',
        CSS_OPERATOR   = 'operator',    CSS_COMMENT    = 'comment',
        CSS_STRING     = 'string',      CSS_STRING_2   = 'string-2',
        CSS_META       = 'meta',        CSS_ERROR      = 'error',
        CSS_QUALIFIER  = 'qualifier',   CSS_BUILTIN    = 'builtin',
        CSS_BRACKET    = 'bracket',     CSS_TAG        = 'tag',
        CSS_ATTRIBUTE  = 'attribute',   CSS_HEADER     = 'header',
        CSS_QUOTE      = 'quote',       CSS_HR         = 'hr',
        CSS_LINK       = 'link',

        ED_DEF      = CSS_DEF,        ED_TYPE      = CSS_ATOM,
        ED_CHAR     = CSS_STRING_2,   ED_SYSTEM    = CSS_META,
        ED_IDENT    = CSS_VARIABLE,   ED_ERROR     = CSS_ERROR,
        ED_STRING   = CSS_STRING,     ED_COMMENT   = CSS_COMMENT,
        ED_BRACKET  = CSS_BRACKET,    ED_KEYWORD   = CSS_KEYWORD,
        ED_OPERATOR = CSS_OPERATOR,   ED_QUALIFIER = CSS_QUALIFIER,

        OBJ_KEYWORD    = 'keyword',
        OBJ_PREDEFINED = 'predefined',
        OBJ_SYSTEM     = 'system',

        OBERON = (function () {
            var _symbols = {
                    NULL:       0,  TIMES:      1,  SLASH:   2,  DIV:     3,  MOD:      4,
                    AND:        5,  PLUS:       6,  MINUS:   7,  OR:      8,  EQL:      9,
                    NEQ:       10,  LSS:       11,  LEQ:    12,  GTR:    13,  GEQ:     14,
                    IN:        15,  IS:        16,  ARROW:  17,  PERIOD: 18,  COMMA:   19,
                    COLON:     20,  UPTO:      21,  RPAREN: 22,  RBRAK:  23,  RBRACE:  24,
                    OF:        25,  THEN:      26,  DO:     27,  TO:     28,  BY:      29,
                    LPAREN:    30,  LBRAK:     31,  LBRACE: 32,  NOT:    33,  BECOMES: 34,
                    NUMBER:    35,  NIL:       36,  TRUE:   37,  FALSE:  38,  STRING:  39,
                    IDENT:     40,  SEMICOLON: 41,  BAR:    42,  END:    43,  ELSE:    44,
                    ELSIF:     45,  UNTIL:     46,  IF:     47,  CASE:   48,  WHILE:   49,
                    REPEAT:    50,  FOR:       51,  LOOP:   52,  WITH:   53,  EXIT:    54,
                    RETURN:    55,  ARRAY:     56,  OBJECT: 57,  RECORD: 58,  POINTER: 59,
                    BEGIN:     60,  CODE:      61,  CONST:  62,  TYPE:   63,  VAR:     64,
                    PROCEDURE: 65,  IMPORT:    66,  MODULE: 67,  EOF:    68,  ERROR:   69
                },
                _words = {
                    'ABS'   : { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'ABS',    css: ED_DEF },
                    'ASR'   : { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'ASR',    css: ED_DEF },
                    'ASSERT': { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'ASSERT', css: ED_DEF },
                    'CHR'   : { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'CHR',    css: ED_DEF },
                    'COPY'  : { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'COPY',   css: ED_DEF },
                    'DEC'   : { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'DEC',    css: ED_DEF },
                    'EXCL'  : { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'EXCL',   css: ED_DEF },
                    'FLOOR' : { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'FLOOR',  css: ED_DEF },
                    'FLT'   : { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'FLT',    css: ED_DEF },
                    'INC'   : { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'INC',    css: ED_DEF },
                    'INCL'  : { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'INCL',   css: ED_DEF },
                    'LEN'   : { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'LEN',    css: ED_DEF },
                    'LSL'   : { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'LSL',    css: ED_DEF },
                    'LONG'  : { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'LONG',   css: ED_DEF },
                    'NEW'   : { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'NEW',    css: ED_DEF },
                    'ODD'   : { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'ODD',    css: ED_DEF },
                    'ORD'   : { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'ORD',    css: ED_DEF },
                    'PACK'  : { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'PACK',   css: ED_DEF },
                    'ROR'   : { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'ROR',    css: ED_DEF },
                    'SHORT' : { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'SHORT',  css: ED_DEF },
                    'UNPK'  : { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'UNPK',   css: ED_DEF },

                    'BOOLEAN' : { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'BOOLEAN',  css: ED_TYPE },
                    'CHAR'    : { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'CHAR',     css: ED_TYPE },
                    'INTEGER' : { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'INTEGER',  css: ED_TYPE },
                    'LONGREAL': { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'LONGREAL', css: ED_TYPE },
                    'REAL'    : { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'REAL',     css: ED_TYPE },
                    'SET'     : { sym: _symbols.IDENT, type: OBJ_PREDEFINED, name: 'SET',      css: ED_TYPE },

                    'ADR' : { sym: _symbols.IDENT, type: OBJ_SYSTEM, name: 'ADR',  css: ED_SYSTEM },
                    'SIZE': { sym: _symbols.IDENT, type: OBJ_SYSTEM, name: 'SIZE', css: ED_SYSTEM },
                    'BIT' : { sym: _symbols.IDENT, type: OBJ_SYSTEM, name: 'BIT',  css: ED_SYSTEM },
                    'GET' : { sym: _symbols.IDENT, type: OBJ_SYSTEM, name: 'GET',  css: ED_SYSTEM },
                    'PUT' : { sym: _symbols.IDENT, type: OBJ_SYSTEM, name: 'PUT',  css: ED_SYSTEM },

                    'ARRAY'    : { sym: _symbols.ARRAY,     type: OBJ_KEYWORD, name: 'ARRAY',     css: ED_KEYWORD },
                    'BEGIN'    : { sym: _symbols.BEGIN,     type: OBJ_KEYWORD, name: 'BEGIN',     css: ED_KEYWORD },
                    'BY'       : { sym: _symbols.BY,        type: OBJ_KEYWORD, name: 'BY',        css: ED_KEYWORD },
                    'CASE'     : { sym: _symbols.CASE,      type: OBJ_KEYWORD, name: 'CASE',      css: ED_KEYWORD },
                    'CONST'    : { sym: _symbols.CONST,     type: OBJ_KEYWORD, name: 'CONST',     css: ED_KEYWORD },
                    'DIV'      : { sym: _symbols.DIV,       type: OBJ_KEYWORD, name: 'DIV',       css: ED_KEYWORD },
                    'DO'       : { sym: _symbols.DO,        type: OBJ_KEYWORD, name: 'DO',        css: ED_KEYWORD },
                    'ELSE'     : { sym: _symbols.ELSE,      type: OBJ_KEYWORD, name: 'ELSE',      css: ED_KEYWORD },
                    'ELSIF'    : { sym: _symbols.ELSIF,     type: OBJ_KEYWORD, name: 'ELSIF',     css: ED_KEYWORD },
                    'END'      : { sym: _symbols.END,       type: OBJ_KEYWORD, name: 'END',       css: ED_KEYWORD },
                    'FALSE'    : { sym: _symbols.FALSE,     type: OBJ_KEYWORD, name: 'FALSE',     css: ED_KEYWORD },
                    'FOR'      : { sym: _symbols.FOR,       type: OBJ_KEYWORD, name: 'FOR',       css: ED_KEYWORD },
                    'IF'       : { sym: _symbols.IF,        type: OBJ_KEYWORD, name: 'IF',        css: ED_KEYWORD },
                    'IMPORT'   : { sym: _symbols.IMPORT,    type: OBJ_KEYWORD, name: 'IMPORT',    css: ED_KEYWORD },
                    'IN'       : { sym: _symbols.IN,        type: OBJ_KEYWORD, name: 'IN',        css: ED_KEYWORD },
                    'IS'       : { sym: _symbols.IS,        type: OBJ_KEYWORD, name: 'IS',        css: ED_KEYWORD },
                    'MOD'      : { sym: _symbols.MOD,       type: OBJ_KEYWORD, name: 'MOD',       css: ED_KEYWORD },
                    'MODULE'   : { sym: _symbols.MODULE,    type: OBJ_KEYWORD, name: 'MODULE',    css: ED_KEYWORD },
                    'NIL'      : { sym: _symbols.NIL,       type: OBJ_KEYWORD, name: 'NIL',       css: ED_KEYWORD },
                    'OF'       : { sym: _symbols.OF,        type: OBJ_KEYWORD, name: 'OF',        css: ED_KEYWORD },
                    'OR'       : { sym: _symbols.OR,        type: OBJ_KEYWORD, name: 'OR',        css: ED_KEYWORD },
                    'POINTER'  : { sym: _symbols.POINTER,   type: OBJ_KEYWORD, name: 'POINTER',   css: ED_KEYWORD },
                    'PROCEDURE': { sym: _symbols.PROCEDURE, type: OBJ_KEYWORD, name: 'PROCEDURE', css: ED_KEYWORD },
                    'RECORD'   : { sym: _symbols.RECORD,    type: OBJ_KEYWORD, name: 'RECORD',    css: ED_KEYWORD },
                    'REPEAT'   : { sym: _symbols.REPEAT,    type: OBJ_KEYWORD, name: 'REPEAT',    css: ED_KEYWORD },
                    'RETURN'   : { sym: _symbols.RETURN,    type: OBJ_KEYWORD, name: 'RETURN',    css: ED_KEYWORD },
                    'THEN'     : { sym: _symbols.THEN,      type: OBJ_KEYWORD, name: 'THEN',      css: ED_KEYWORD },
                    'TO'       : { sym: _symbols.TO,        type: OBJ_KEYWORD, name: 'TO',        css: ED_KEYWORD },
                    'TRUE'     : { sym: _symbols.TRUE,      type: OBJ_KEYWORD, name: 'TRUE',      css: ED_KEYWORD },
                    'TYPE'     : { sym: _symbols.TYPE,      type: OBJ_KEYWORD, name: 'TYPE',      css: ED_KEYWORD },
                    'UNTIL'    : { sym: _symbols.UNTIL,     type: OBJ_KEYWORD, name: 'UNIL',      css: ED_KEYWORD },
                    'VAR'      : { sym: _symbols.VAR,       type: OBJ_KEYWORD, name: 'VAR',       css: ED_KEYWORD },
                    'WHILE'    : { sym: _symbols.WHILE,     type: OBJ_KEYWORD, name: 'WHILE',     css: ED_KEYWORD }
                };

            return {
                Symbol: _symbols,
                Words: _words,
            };
        })(),


        _words = OBERON.Words,

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
                    var _word,
                        _token = ED_IDENT,
                        _str = sym,
                        _ch = stream.next();

                    while (_ch && _isAlphaOrDigit(_ch) && !stream.eol()) {
                        _str += _ch;
                        _ch = stream.next();
                    }
                    if (_isAlphaOrDigit(_ch)) {
                        _str += _ch;
                    }

                    state.name = _str;
                    if (_ch === '.' || _ch === '[') {
                        _token = ED_QUALIFIER;
                    }

                    _word = OBERON.Words[_str];

                    if (_word) {
                        switch (_word.name) {
                            case 'MODULE':
                            case 'PROCEDURE':
                            case 'IF':
                            case 'FOR':
                            case 'WHILE':
                                state.scope += 1;
                                break;

                            case 'END':
                                state.scope -= state.scope > 0 ? 1 : 0;

                            default:
                        }
                        _token = _word.css;
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
                    if (stream.eol() && _ch != sym) {
                        state.error = 'string.not.close';
                        return ED_ERROR;
                    }
                    state.name = _str;
                    return ED_STRING;
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
                    return ED_COMMENT;
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
                    return ED_BRACKET;

                case '(':
                    if (stream.peek() === '*') {
                        state.level += 1;
                        return _comment();
                    }
                    return ED_BRACKET;

                case ':':
                    if (stream.peek() === '=') {
                        _ch = stream.next();
                        return ED_KEYWORD;
                    }
                    return ED_OPERATOR;

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
                    return ED_OPERATOR;
            }

            return null;
        },
        _indent = function (state, textAfter) {
            var word;

            if (textAfter) {
                word = textAfter.split(' ');
                if (word[0] === 'END') {
                    state.scope -= state.scope > 0 ? 1 : 0;
                }
            }
            return state.scope;
        };

  // Interface

    return {
        startState: _startState,
        token: _token,
        indent: _indent,
        electricChars: null
    };

});

CodeMirror.defineMIME("text/x-oberon07", "oberon07");
