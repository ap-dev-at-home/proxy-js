import { $p, BindingBase } from './core.js'

$p.components.core(function (core) {
    class StyleBinding extends BindingBase {

        constructor($e, controller, expression, isClassBinding) {
            super();

            this.isClassBinding = isClassBinding;
            core.addBinding($e, this, (isClassBinding == true) ? 'class' : 'style');
            this.$e = $e;
            this.expression = expression;
            this.observerParentCallbackHandler = this.observerParentCallback.bind(this);
            this.observerCallbackHandler = this.observerCallback.bind(this);
            this.controller = controller;
            this.identifiers = [];
            this.listener = [];

            this.parse();
            this.exec();
            this.observe();
        }

        parse() {
            this.identifiers = core.findIdentifiers(this.expression);
            this.virtualContext = core.virtualContext(this.$e, this.controller); 
        }

        exec() {
            if (this.isClassBinding == true) {
                this.execClass();
            }
            else {
                this.execStyle();
            }
        }

        execStyle() {
            this.virtualContext.exec('_callback((' + this.expression + '))', function (result) {
                if (typeof result === 'object') {
                    for (var p in result) {
                        this.$e.style[p] = result[p];
                    }
                }
                else if (typeof result === 'string') {
                    this.$e.setAttribute('style', result);
                }
            }.bind(this));
        }

        execClass() {
            this.virtualContext.exec('_callback((' + this.expression + '))', function (result) {
                if (typeof result === 'object') {
                    for (var p in result) {
                        if (result[p] === true) {
                            this.$e.classList.add(p);
                        }
                        else {
                            this.$e.classList.remove(p);
                        }
                    }
                }
                else if (typeof result === 'string') {
                    this.$e.setAttribute('class', result)
                }
            }.bind(this));
        }

        observe() {
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
            delete this.identifiers;
            delete this.listener;
            delete this.virtualContext;
            delete this.$e;
            delete this.controller;
        }
    };

    core.cstr.styleBinding = StyleBinding;

    core.addAttrHandler({
        priority: 2,

        can: function ($e, controller, name, value) {
            return name == ':style' || name == ':class';
        },

        handle: function (bindings, $e, controller, name, value) {
            new core.cstr.styleBinding($e, controller, value, (name == ':class'));
            
            return true;
        }
    });
});