YUI.add('se-model-docs', function (Y) {

    Y.namespace('SE.Models').Docs = Y.Base.create('docsModelSE', Y.Model, [], {
        getInfo: function () {
            var strings = this.get('strings');

            return strings.info;
        }
    }, {
        ATTRS: {
            title: {
                value: null,
                validator: Y.Lang.isString
            },
            description: {
                value: null,
                validator: Y.Lang.isString
            },
            strings: {
                valueFn: function () {
                    return Y.Intl.get('se-model-docs');
                }
            }
        }
    });

}, '1.0', {
    lang: [
        'ru'
    ],
    requires: [
        'model'
    ]
});