import { $p, BindingBase } from './core.js'

$p.components.core(function (core) {
    const BINDING_TYPE_FOR = core.defineConstant('BINDING_TYPE_FOR');
    const BINDING_TYPE_FOR_ITEM = core.defineConstant('BINDING_TYPE_FOR_ITEM');
    
    const ATTRIBUTE_NAME_COMPONENT = 'p-component';

    class ForBinding extends BindingBase {
    
        constructor($e, controller, expression) {
            super();

            core.addBinding($e, this, 'for');

            if ($e.tagName == 'TEMPLATE') {
                this.extractTemplateCallback($e, controller);
            }
            else {
                this.$template = $e.cloneNode(true);
                this.$template.removeAttribute('p-for');
            }
            
            this.controller = controller;
            this.expression = expression;
            this.listener = [];
            
            const forComponents = expression.split(' ');
            if (forComponents.length != 3) {
                throw new SyntaxError('Expression not recognized ' + expression);
            }

            this.forComponents = forComponents;

            //create comment
            this.$for = document.createComment('for ' + expression);
            this.$for.bindings = [this];
            core.setBindingData(this.$for, {
                instance: this
            }, BINDING_TYPE_FOR);
            
            //replace for-element by for-comment
            $e.parentNode.replaceChild(this.$for, $e);
            
            this.exec();
            this.observe();
        }

        extractTemplateCallback($e, controller) {
            const onItem = $e.getAttribute(ATTRIBUTE_NAME_COMPONENT);

            const { handler, parameter } = core.eventHandlerExpression(onItem);
            
            if (handler == null) {
                throw new SyntaxError(`Callback missing or incorrectly formed -> ${ATTRIBUTE_NAME_COMPONENT}="onComponent(item)"`);
            }

            if (typeof controller[handler] !== 'function') {
                throw new SyntaxError(`Callback is not a function or does not exists -> ${ATTRIBUTE_NAME_COMPONENT}="${handler}"`);
            }

            this.handler = controller[handler].bind(this.controller);
        }

        exec() {
            const result = [];

            this.virtualContext = core.virtualContext(this.$for, this.controller);
            
            var $refNode = this.$for;
            this.virtualContext.exec('for (var index = 0; index < ' + this.forComponents[2] + '.length; index++) { _callback(' + this.forComponents[2] + '[index], index, ' + this.forComponents[2] + ');  }', (item, index, array) => { 
                const $item = this.createNode(index, item);
                result.push($item);
                this.$for.parentNode.insertBefore($item, $refNode.nextSibling);
                $refNode = $item;
            });

            return result;
        }

        createNode(index, item) {
            var $item = null;

            if (this.handler) {
                $item = this.handler(item);
                if (typeof $item === 'string') {
                    $item = document.createElement($item);
                }

                $item.model = item;
            }
            else {
                $item = core.template(this.$template, item);
            }

            if (!$item) {
                throw new SyntaxError('Template is not defined -> p-for - ' + this.expression);
            }

            core.setBindingData($item, {
                index: index,
                $for: this.$for,
                scopeName: this.forComponents[0], 
                value: item
            }, BINDING_TYPE_FOR_ITEM);

            return $item;
        }

        observe() {
            const array = this.virtualContext.exec(this.forComponents[2]);
            const parent = this.virtualContext.exec(core.getParentObjectName(this.forComponents[2]));
            const propertyName = core.getPropertyName(this.forComponents[2])

            const arrayListener = array._observe((type, arr, prop, value, oldValue) => {
                const index = parseInt(prop);
                if (isNaN(index)) {
                    return;
                }
                
                var eIdx = -1, lastIdx = -1;
                for (var i = core.nodeIndex(this.$for) + 1; i < this.$for.parentNode.childNodes.length; i++) {
                    const bindingData = core.getBindingData(this.$for.parentNode.childNodes[i], BINDING_TYPE_FOR_ITEM);
                    if (bindingData && bindingData.$for == this.$for) {
                        lastIdx = i;
                        if (bindingData.index == index) {
                            eIdx = i;
                        }
                    }                    
                }

                if (type == 'set') {	
                    const $item = this.createNode(index, value);

                    if (eIdx > -1) {
                        core.bindingsDisconnect(this.$for.parentElement.childNodes[eIdx]);
                        this.$for.parentElement.replaceChild($item, this.$for.parentElement.childNodes[eIdx]);
                    }
                    else {
                        core.insertAfter($item, lastIdx < 0 ? this.$for : this.$for.parentElement.childNodes[lastIdx]);
                    }

                    core.bindingsConnect(this.controller, $item);
                }
                else if (type == 'delete') {
                    core.bindingsDisconnect(this.$for.parentElement.childNodes[eIdx]);
                    this.$for.parentNode.removeChild(this.$for.parentElement.childNodes[eIdx]);
                }
            });
            
            const parentListenerCallback = (type, obj, prop, value, oldValue) => {
                arrayListener.move(value);

                //remove elements
                const elements = [];
                core.arr.forEach.call(this.$for.parentElement.children, $e => {
                    const bindingData = core.getBindingData($e, BINDING_TYPE_FOR_ITEM);
                    if (bindingData && bindingData.$for == this.$for) {
                        elements.push($e);
                    }
                });

                elements.forEach($e => {
                    core.bindingsDisconnect($e);
                    $e.parentElement.removeChild($e);
                });

                //add, bind elements
                this.exec().forEach($item => { core.bindingsConnect(this.controller, $item) });
            };

            const parentListener = parent._observe(parentListenerCallback, propertyName);

            this.listener.push(arrayListener, parentListener);
        }

        destroyObserver() {
            this.listener.forEach(l => { l.remove(); });
            this.listener = [];
        }

        destroy() {
            this.destroyObserver();
            delete this.$template;
            delete this.$for;
            delete this.controller;
            delete this.virtualContext;
        }
    }

    core.cstr.forBinding = ForBinding;

    core.addAttrHandler({
        priority: 3,

        can: function ($e, controller, name, value) {
            return name == 'p-for';
        },

        handle: function (bindings, $e, controller, name, value) {
            new core.cstr.forBinding($e, controller, value);

            return false;
        }
    });
});