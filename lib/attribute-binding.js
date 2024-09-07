import { $p, BindingBase } from './core.js'

$p.components.core(function (core) {
    class AttributeBinding extends BindingBase {
    
        constructor($e, controller, name, expression) {
            super();

            core.addBinding($e, this, 'attribute');
            this.$e = $e;
            this.controller = controller;
            this.expression = expression;
            this.observerParentCallbackHandler = this.observerParentCallback.bind(this);
            this.observerCallbackHandler = this.observerCallback.bind(this);
            this.listener = [];

            this.parse(name);
            this.exec();
            this.observe();
        }

        parse(name) {
            const attrName = name.substr(1);
            if (!attrName) {
                throw new SyntaxError('Invalid attribute definition -> ' + name + ' - ' + this.expression + ', example: ' + ':disabled="model.disabled"');
            }

            this.name = attrName;

            this.identifiers = core.findIdentifiers(this.expression);

            this.virtualContext = core.virtualContext(this.$e, this.controller);
        }

        exec() {
            const virtualContext = core.virtualContext(this.$e, this.controller);
            const value = virtualContext.exec(this.expression);
            if (value == undefined) {
                this.$e.removeAttribute(this.name);
            }
            else {
                this.$e.setAttribute(this.name, value);
            }
        }

        observe() {
            this.destroyObserver();

            this.identifiers.forEach(identifier => {
                this.defaultListener(identifier, this.listener, this.observerCallbackHandler, this.observerParentCallbackHandler);
            });
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
            this.destroyObserver();
            delete this.observerCallbackHandler;
            delete this.observerParentCallbackHandler;
            delete this.virtualContext;
            delete this.$e;
            delete this.controller;
            delete this.identifiers;
        }
    }

    core.cstr.attributeBinding = AttributeBinding;

    core.addAttrHandler({
        priority: 1,

        can: function ($e, controller, name, value) {
            return name.startsWith(':');
        },

        handle: function (bindings, $e, controller, name, value) {
            new core.cstr.attributeBinding($e, controller, name, value);
            
            return true;
        }
    });
});