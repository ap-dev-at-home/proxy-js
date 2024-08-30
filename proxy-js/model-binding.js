import { $p, BindingBase } from './core.js'

$p.components.core(function (core) {
    class ModelBinding extends BindingBase {
    
        constructor($e, controller, expression) {
            super();
            
            core.addBinding($e, this, 'model');
            this.$e = $e;
            this.controller = controller;
            this.expression = expression;
            this.identifiers = [];
            this.inputCallbackHandler = this.onInputCallback.bind(this);
            this.observerParentCallbackHandler = this.observerParentCallback.bind(this);
            this.observerCallbackHandler = this.observerCallback.bind(this);
            this.listener = [];

            this.parse();
            this.exec();
            this.events();
            this.observe();
        }

        parse() {
            this.identifiers = core.findIdentifiers(this.expression);
            
            if (this.identifiers.length > 1) {
                throw new SyntaxError('Model contains more than one identifier -> ' + this.expression + ', example: p-model="model.value"');
            }

            if (this.identifiers.length == 0) {
                throw new SyntaxError('Model does not contain identifier -> ' + this.expression + ', example: p-model="model.value"');
            }

            this.virtualContext = core.virtualContext(this.$e, this.controller);
        }

        exec() {
            const identifier = this.identifiers[0];
            const value = this.virtualContext.exec(identifier.name);
            if (this.$e.tagName == 'INPUT') {
                if (this.$e.type == 'text') {
                    if (value == undefined || value == null)
                        this.$e.value = '';
                    else 
                        this.$e.value = value;
                }
                else if (this.$e.type == 'checkbox') {
                    if (value == undefined || value == null || value == false) {
                        this.$e.checked = false;
                    }
                    else if (value == true) {
                        this.$e.checked = value;
                    }
                }
            }
        }

        events() {
            //input -> model
            this.$e.addEventListener('input', this.inputCallbackHandler);
        }

        observe() {
            this.destroyObserver();
            const identifier = this.identifiers[0];

            //model -> input
            this.defaultListener(identifier, this.listener, this.observerCallbackHandler, this.observerParentCallbackHandler);
        }

        onInputCallback(e) {
            const identifier = this.identifiers[0];
            if (this.$e.tagName == 'INPUT') {
                const obj = this.virtualContext.exec(identifier.parentName);

                if (this.$e.type == 'text') {    
                    obj[identifier.propertyName] = new core.cstr.silent(e.target.value, this.listener);
                }
                else if (this.$e.type == 'checkbox') {
                    obj[identifier.propertyName] = new core.cstr.silent(e.target.checked, this.listener);
                }
            }
        }

        observerParentCallback(type, obj, prop, value, oldValue) {
            this.observe();
            this.exec();
        }

        observerCallback(type, obj, prop, value, oldValue) {
            this.exec();
        }

        destroyObserver() {
            this.listener.forEach(l => { l.remove(); });
            this.listener = [];
        }

        destroy() {
            this.$e.removeEvemtListener('input', this.inputCallbackHandler);
            delete this.inputCallbackHandler;
            this.destroyObserver();
            delete this.observerCallbackHandler;
            delete this.observerParentCallbackHandler;
            delete this.virtualContext;
            delete this.$e;
            delete this.controller;
            delete this.identifiers;
        }
    }

    core.cstr.modelBinding = ModelBinding;

    core.addAttrHandler({
        can: function ($e, controller, name, value) {
            return name == 'p-model';
        },

        handle: function (bindings, $e, controller, name, value) {
            new core.cstr.modelBinding($e, controller, value);
            
            return true;
        }
    });
});