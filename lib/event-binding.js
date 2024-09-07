import { $p, BindingBase } from './core.js'

const MODIFIERS = ['capture', 'once'];

$p.components.core(function (core) {
    class EventBinding extends BindingBase {
    
        constructor($e, controller, name, value) {
            super();

            core.addBinding($e, this, 'event');
            this.$e = $e;
            this.controller = controller;
            this.value = value;
            this.modifiers = [];

            var eventString = name.substring(1);
            
            this.eventName = core.nextToken(eventString, 0, core.isEventIdentifier);
            if (!this.eventName) {
                throw new SyntaxError('Invalid event definition -> ' + name + ' - ' + value + ', example: ' + '@event="handler($e, e, item)"');
            }

            var modifierIndex = eventString.indexOf('.');
            var selectorIndex = eventString.indexOf('&');
            modifierIndex = modifierIndex > -1 && (selectorIndex < 0 || modifierIndex < selectorIndex) ? modifierIndex : -1;
            selectorIndex = selectorIndex > -1 && (modifierIndex < 0 || selectorIndex > modifierIndex) ? selectorIndex : -1;

            if (modifierIndex > -1) {
                var modifierList = eventString
                    .substring(this.eventName.length, selectorIndex > -1 ? selectorIndex : eventString.length)
                    .split('.')
                    .filter(modifier => modifier && modifier.length > 0);

                modifierList.forEach(modifier => {
                    if (MODIFIERS.indexOf(modifier.toLowerCase()) > -1) {
                        this.modifiers.push(modifier);
                    }
                    else {
                        throw new SyntaxError('Invalid event modifier -> ' + modifier + ', allowed options: ' + 'capture, once');
                    }
                }, this);
            }

            if (selectorIndex > -1) {
                var selector = eventString.substring(selectorIndex + 1);
                this.eventMatch = selector;
            }

            const { handler, parameter } = core.eventHandlerExpression(value);

            if (handler == null) {
                throw new SyntaxError('Eventhandler missing or incorrectly formed -> ' + name + ' - ' + value);
            }

            if (typeof controller[handler] !== 'function') {
                throw new SyntaxError('Event handler is not a function or does not exists -> ' + name + ' - ' + value);
            }
        
            this.handler = this.handle(controller, handler, parameter);

            if (this.modifiers.includes('capture')) {
                $e.addEventListener(this.eventName, this.handler, true);
            }
            else {
                $e.addEventListener(this.eventName, this.handler);
            }
        }

        handle(controller, handler, parameter) {
            return function (e) {
                var $target = this.$e;

                if (this.eventMatch) {
                    var $eMatch = e.composedPath().find($p => $p.matches && $p.matches(this.eventMatch));
                    if ($eMatch) {
                        $target = $eMatch;
                    }
                    else {
                        return;
                    }
                }

                const contextFunction = core.virtualContext($target, controller, ['$e', $target, 'e', e]);
                contextFunction.exec('_callback(' + parameter + ')', function () {
                    controller[handler].apply(controller, arguments);
                });

                if (this.modifiers.includes('once')) {
                    this.unhandle();
                }
            }.bind(this);
        }

        unhandle() {
            if (this.handler == null) {
                return;
            }

            if (this.modifiers.includes('capture')) {
                this.$e.removeEventListener(this.eventName, this.handler, true);
            }
            else {
                this.$e.removeEventListener(this.eventName, this.handler);
            }

            this.handler = null;
        }

        destroy() {
            this.unhandle();
            delete this.$e;
            delete this.controller;
            delete this.value;
            delete this.eventName;
            delete this.handler;
        }
    }

    core.cstr.eventBinding = EventBinding;

    core.addAttrHandler({
        can: function ($e, controller, name, value) {
            return name.startsWith('@') == true;
        },

        handle: function (bindings, $e, controller, name, value) {
            new core.cstr.eventBinding($e, controller, name, value);
            
            return true;
        }
    });
});