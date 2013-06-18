YUI.add('ui-app-se', function (Y) {

    var MODULE = 'module';

    Y.namespace('UI.App').Se = Y.Base.create('seAppUI', Y.App, [], {
        views: {
            // libs: {
            //     type: Y.UI.Pages.Libs
            // },
            // lib: {
            //     type: Y.UI.Pages.Lib,
            //     parent: 'libs'
            // },
            // projects: {
            //     type: Y.UI.Pages.Projects
            // },
            // project: {
            //     type: Y.UI.Pages.Project,
            //     parent: 'projects'
            // },
            module: {
                type: Y.UI.Pages.Module,
                // parent: 'project'
            },
            // runtime: {
            //     type: Y.UI.Pages.Runtime
            // },
            // docs: {
            //     type: Y.UI.Pages.Docs
            // }
        },

        initializer: function () {
            var self = this;

            self.once('ready', function (event) {
                if (self.hasRoute(self.getPath())) {
                    self.dispatch();
                } else {
                    self.showModule();
                }
            });
        },

        // showLibs: function (req, res) {
        //     this.showView('docs'); // libs;
        // },
        
        // showLib: function (req, res) {
        //     this.showView('docs'); // lib
        // },
        
        // showProjects: function (req, res) {
        //     this.showView('docs'); // projects
        // },
        
        // showProject: function (req, res) {
        //     this.showView('docs'); // project
        // },

        showModule: function (req, res) {
            this.showView('module', { module: this.getModule() });
        },
        
        // showRuntime: function (req, res) {
        //     this.showView('docs'); // runtime
        // },

        // showDocs: function (req, res) {
        //     this.showView('docs');
        // },

        getModule: function () {
            return this.get(MODULE);
        },

        setModule: function (module) {
            return this.set(MODULE, module);
        }
    }, {
        ATTRS: {
            routes: [
                { path: '/',         callbacks: 'showModule' },
                // { path: '/libs',     callbacks: 'showLibs' },
                // { path: '/lib',      callbacks: 'showLib' },
                // { path: '/projects', callbacks: 'showProjects' },
                // { path: '/project',  callbacks: 'showProject' },
                { path: '/module',   callbacks: 'showModule' },
                // { path: '/runtime',  callbacks: 'showRuntime' },
                // { path: '/docs',     callbacks: 'showDocs' }
            ],
            module: {
                value: new Y.SE.Models.Module,
                validator: function (mod) {
                    return mod instanceof Y.SE.Models.Module;
                }
            },
            user: {
                value: null
            }
        }
    });

}, '1.0', {
    requires: [
        'app',
        // 'ui-page-libs',
        // 'ui-page-lib',
        // 'ui-page-projects',
        // 'ui-page-project',
        'ui-page-module',
        // 'ui-page-runtime',
        // 'ui-page-docs'
        'se-model-module'
    ]
});