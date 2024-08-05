import { $p, BindingBase } from './core.js'

$p.components.core(function (core) {
	class EventBinding extends BindingBase {
	
		constructor($e, controller, name, value) {
            super();

			core.addBinding($e, this, 'event');
			this.$e = $e;
			this.controller = controller;
			this.value = value;
	
            var eventString = name.substring(1);
            var separatorIndex = eventString.indexOf('&');
            if (separatorIndex > -1) {
                this.eventName = eventString.substring(0, separatorIndex);
                this.eventMatch = eventString.substring(separatorIndex + 1);
            }
            else {
                this.eventName = eventString;
            }
            
			if (!this.eventName) {
				throw new Error('Invalid event definition -> ' + name + ' ' + value + ', example: ' + '@event="handler($e, e, item)"');
			}

            const { handler, parameter } = core.eventHandlerExpression(value);

            if (handler == null) {
                throw new Error('Eventhandler missing or incorrectly formed -> ' + name + ' ' + value);
            }

            if (typeof controller[handler] != 'function') {
                throw new Error('Event callback is not a function or does not exists -> ' + name + ' ' + value);
            }
		
			$e.addEventListener(this.eventName, this.handler = (e) => {
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
			});
		}

        destroy() {
            this.$e.removeEventListener(this.eventName, this.handler);
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