YUI.add('se-model-module', function (Y) {

    var ID = 'id',
        AST = 'ast',
        SYM = 'sym',
        CODE = 'code',
        NAME = 'name',
        TEXT = 'text';

    Y.namespace('SE.Models').Module = Y.Base.create('moduleModelSE', Y.Model, [], {
        getId: function () {
            return this.get(ID);
        },

        setId: function (id) {
            return this.set(ID, id);
        },

        getName: function () {
            return this.get(NAME);
        },

        setName: function (name) {
            return this.set(NAME, name);
        },

        getAst: function () {
            return this.get(AST);
        },

        setAst: function (ast) {
            return this.set(AST, ast);
        },

        getSym: function () {
            return this.get(SYM);
        },

        setSym: function (sym) {
            return this.set(SYM, sym);
        },

        getCode: function () {
            return this.get(CODE)
        },

        setCode: function (code) {
            return this.set(CODE, code);
        },

        getText: function () {
            return this.get(TEXT);
        },

        setText: function (text) {
            return this.set(TEXT, text);
        },

        isReady: function () {
            return !Y.Lang.isNull(this.get(CODE));
        }
    }, {
        ATTRS: {
            ast: {
                value: null
            },
            sym: {
                value: null
            },
            code: {
                value: null
            },
            name: {
                value: 'noname',
                validator: Y.Lang.isString
            },
            text: {
                value: 'MODULE noname; END noname.',
                validator: Y.Lang.isString
            }
        }
    });

}, '1.0', {
    requires: [
        'model'
    ]
});