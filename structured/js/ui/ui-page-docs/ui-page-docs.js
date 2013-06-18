YUI.add('ui-page-docs', function (Y) {

    Y.namespace('UI.Pages').Docs = Y.Base.create('docsPageUI', Y.View, {
        template: '<h3>{{title}}</h3>' +
                '<p>{{description}}</p>',

        render: function () {
            var self = this,
                doc = self.get('doc'),
                container = self.get('container'),
                content = Y.Handlebars.compile(self.template);

            container.setHTML(content(doc.toJSON()));
        }

    }, {
        ATTRS: {
            doc: {
                value: null,
                validator: function (doc) {
                    return doc instanceof Y.SE.Models.Docs;
                }
            }
        }
    });

}, '1,0', {
    requires: [
        'view',
        'handlebars',
        'se-model-docs'
    ]
});