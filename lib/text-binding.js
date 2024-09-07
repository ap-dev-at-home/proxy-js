import { $p, BindingBase } from './core.js'

$p.components.core(function (core) {	
    class TextBinding extends BindingBase {
    
        constructor($text, controller, expression) {
            super();

            core.addBinding($text, this, 'text');
            this.$text = $text;
            this.controller = controller;
            this.expression = $text.textContent;
            this.observerParentCallbackHandler = this.observerParentCallback.bind(this);
            this.observerCallbackHandler = this.observerCallback.bind(this);
            this.expressions = [];
            this.listener = [];

            this.parse();
            this.exec();
            this.observe();
        }

        parse() {
            this.expressions = core.textExpression(this.expression);

            const propsArray = ['$text', this.$text];
            core.ioHandler.forEach(h => propsArray.push(`$${h.name}`, h.out));

            this.virtualContext = core.virtualContext(this.$text, this.controller, propsArray);
        }

        exec() {
            var textContent = '';

            for (var i = 0; i < this.expressions.length; i++) {

                const descriptor = this.expressions[i];
                const isText = (descriptor.text != undefined);

                if (isText == true) {
                    textContent = textContent + descriptor.text;
                }
                else {
                    this.virtualContext.exec('_callback(' + descriptor.expression + ')', (value) => {
                        textContent = textContent + value;
                    });
                }
            }

            this.$text.textContent = textContent;
        }

        observe() {
            this.destroyObserver();

            this.expressions.forEach(x => {
                if (x.expression == undefined) {
                    return;
                }
                
                x.identifiers.forEach(identifier => {
                    this.defaultListener(identifier, this.listener, this.observerCallbackHandler, this.observerParentCallbackHandler);
                });
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
            delete this.expressions;
            delete this.$text;
            delete this.controller;
            delete this.virtualContext;
        }
    }

    core.cstr.textBinding = TextBinding;

    core.addNodeHandler({
        can: function ($e) {
            return $e.nodeType == Node.TEXT_NODE;
        },

        handle: function (bindings, $e, controller) {
            new core.cstr.textBinding($e, controller);
            
            return false;
        }
    });
});