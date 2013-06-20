YUI.add('ui-page-module', function (Y) {

    var MODULE = 'module',
        STRINGS = 'strings',
        CONTAINER = 'container';

    Y.namespace('UI.Pages').Module = Y.Base.create('modulePageUI', Y.View, [], {
        template: '<h3>{{module_name}}: <i>{{name}}</i></h3><div><textarea id="code">{{text}}</textarea></div>',

        render: function () {
            var editor = new Y.UI.Code.Editor(),
                module = this.get(MODULE),
                strings = this.get(STRINGS),
                content = Y.Handlebars.compile(this.template);
                container = this.get(CONTAINER);

            container.setHTML(content({
                module_name: strings.module.name,
                name: module.getName(),
                text: module.getText()
            }));

            editor.render(container.one('textarea'));

            return this;
        }
    }, {
        ATTRS: {
            module: {
                value: null,
                validator: function (mod) {
                    return mod instanceof Y.SE.Models.Module;
                }
            },
            strings: {
                value: {
                    module: { name: 'Имя модуля' }
                }
            }
        }
    });

}, '1.0', {
    requires: [
        'view',
        'handlebars',
        'se-model-module',
        'ui-code-editor'
    ]
});