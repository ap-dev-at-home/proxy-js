
//types, classes
export class SilentValue {
    constructor(value, listener) {
        this.value = value;
        this.listener = (listener == undefined) ? undefined : listener instanceof Array ? listener : [listener];
    }
}

export class CancellationToken {
    #canceled = false;
    #listener = [];

    get isCanceled() {
        return this.#canceled;
    };

    constructor(name) {
        this.name = name;
    }

    add(callback) {
        this.#listener.push(callback);
    }

    cancel() {
        this.#canceled = true;
        this.#listener.forEach(callback => {
            try {
                callback();
            }
            catch {

            }
        });
    }
}

class ProxyListener {
    constructor(callback, owner, propertyName) {
        this.callback = callback;	
        this.owner = owner;
        this.propertyName = propertyName;
    }

    remove() {
        this.owner._unobserve(this);
    }

    move(owner) {
        this.remove();
        this.owner = owner;
        this.owner._observe(this);
    }
}

export class BindingBase {
    constructor() {

    }

    defaultListener(identifier, listener, observerCallbackHandler, observerParentCallbackHandler) {
        var object = undefined;
        try {
            object = this.virtualContext.exec(identifier.parentName);
        }
        catch {
            return;
        }
        
        if (core.isObject(object) == false || core.isProxy(object) == false) {
            return;
        }

        listener.push(object._observe(observerCallbackHandler, identifier.propertyName));

        core.getAllObjectNames(identifier.name).forEach(name => {
            const parentName = core.getParentObjectName(name);
            const propertyName = core.getPropertyName(name);

            if (propertyName == undefined) {
                return;
            }

            const o = this.virtualContext.exec(parentName);
    
            if (core.isObject(o) == false || core.isProxy(o) == false) {
                return;
            }

            const desc = o._observe(observerParentCallbackHandler, propertyName);
            if (desc == undefined) {
                return;
            }

            listener.push(desc);
        });
    }
}

let constantId = 1;

//core api
const core = {

    nodeHandler: [],
    attrHandler: [],
    ioHandler: [],

    BINDINGS_PROPERTY_NAME: '_bindings',
    BINDING_DATA_PROPERTY_NAME: '_bindingData',

    cstr: { 
        silent: SilentValue,
        listener: ProxyListener
    },

    arr: {
        forEach: Array.prototype.forEach,
        findIndex: Array.prototype.findIndex,
        find: Array.prototype.find,

        removeAll: function (array, predicate, thisArg) {
            if (array === null) {
                throw new TypeError('array is null or not defined');
            }

            if (typeof predicate !== 'function') {
                throw new TypeError('predicate must be a function');
            }
            
            var length = array.length >>> 0;

            for (var i = 0; i < length; i++) {
                if (predicate.call(thisArg, array[i], i, array) === true) {
                    array.splice(i, 1);
                    i--;
                    length--;
                }
            }
        }
    },

    constants: { 

    },

    defineConstant: function (name) {
        var result = this.constants[name];

        if (result == undefined) {
            result = core.constants[name] = constantId++;
        }
        
        return result;
    },

    getBindingData: function ($e, type) {
        return ($e[core.BINDING_DATA_PROPERTY_NAME] 
            && (type == undefined || $e[core.BINDING_DATA_PROPERTY_NAME].type == type) ? $e[core.BINDING_DATA_PROPERTY_NAME] : undefined);
    },

    setBindingData: function ($e, bindingData, type) {
        bindingData.type = type;
        return $e[core.BINDING_DATA_PROPERTY_NAME] = bindingData;
    },

    addBinding: function ($e, binding, type) {
        const bindings = $e[core.BINDINGS_PROPERTY_NAME] || ($e[core.BINDINGS_PROPERTY_NAME] = []);
        binding.type = type;
        bindings.push(binding);
    },

    insertAfter: function ($e, $ref) {
        const parent = $ref.parentNode;
        if (parent.lastChild === $ref) {
            parent.appendChild($e);
        } else {
            parent.insertBefore($e, $ref.nextSibling);
        }
    },

    nodeIndex: function ($n) {
        return this.arr.findIndex.call($n.parentNode, $e => $e == $n);
    },

    TRAVERSE_NODE_SKIP: false,
    TRAVERSE_NODE_STOP: 1,

    traverse: function ($e, callback, level) {
        let result = callback($e, (level || 0));
        if (result == core.TRAVERSE_NODE_STOP) {
            return result;
        }

        if (result === core.TRAVERSE_NODE_SKIP) {
            return result;
        }

        for (var i = 0; i < $e.childNodes.length; i++) {
            let result = this.traverse($e.childNodes[i], callback, (level || 0) + 1);
            if (result == core.TRAVERSE_NODE_STOP) {
                return core.TRAVERSE_NODE_STOP;
            }
        }
    },

    inverse: function ($e, callback, level) {
        for (var i = 0; i < $e.childNodes.length; i++) {
            this.inverse($e.childNodes[i], callback, (level || 0) + 1);
        }

        callback($e, (level || 0));
    },

    isObject: function (v) {
        return (v != null) && (typeof v === 'object');
    },

    isProxy: function (obj) {
        if (_proxyReferences.has(obj)) {
            return true;
        }

        return false;
    },

    isFunction: function (f) {
        return (f instanceof Function);
    },

    isDOM: function (e) {
        return e instanceof HTMLElement
            || (e && e.nodeType == Node.DOCUMENT_FRAGMENT_NODE);
    },

    copy: function (value, filter, refs) {
        refs = refs || new Map();

        if (value === null || value === undefined) {
            return value;
        }
        else if (typeof value !== 'object') { 
            return value;
        }
        else if (value instanceof Date) {
            return new Date(value.getTime());
        }
        else if (value instanceof RegExp) {
            return new RegExp(value);
        }
        else if (Array.isArray(value)) {
            if (refs.has(value) == true) {
                return refs.get(value);
            }
            else {
                var newArray = value.map(item => core.copy(item, filter, refs));
                refs.set(value, newArray);
                return newArray;
            }
        }
        else if (value instanceof Map) {
            const newMap = new Map();
            value.forEach((v, k) => {
                newMap.set(k, core.copy(v, filter, refs));
            });
            
            return newMap;
        }
        else if (value instanceof Set) {
            const newSet = new Set();
            value.forEach(v => {
                newSet.add(core.copy(v, filter, refs));
            });

            return newSet;
        }
        
        const newObject = {};

        if (refs.has(value) == true) {
            return refs.get(value);
        }
        else {
            refs.set(value, newObject);
        }

        for (const key in value) {
            if (value.hasOwnProperty(key) && core.isFunction(value[key]) == false) {
                newObject[key] = core.copy(value[key], filter, refs);
            }
        }
    
        return newObject;
    },

    nextToken: function (str, pos, token) {
        var p = pos, isString = false;

        while (p < str.length) {
            var c = str.charCodeAt(p);
            if (token(c) === false) {
                return str.substring(pos, p);
            }

            p++;
        }

        return str;
    },

    nextTokenPosition: function (str, pos, token) {
        var p = pos, isString = false;

        while (p < str.length) {
            if (str.charCodeAt(p) == 39) { //charCode 39 = '
                if (isString == false) {
                    isString = true;
                }
                else if (str.charCodeAt(p - 1) != 92 ) { //charCode 92 = \
                    isString = false;
                }
            }

            if (isString == true) {
                p++;
                continue;
            }
            
            if (token.constructor == Function.constructor) {
                if (token(str.charCodeAt(p)) === true) {
                    return p;
                }
            }
            else {
                for (var i = 0; i < token.length; i++) {
                    if (p > str.length - 1) {
                        break;
                    }

                    if (str[p] == token[i]) {
                        return p;
                    }
                }
            }

            p++;
        }
    },

    isEventIdentifier: function (c) {
        return (c >= 97 && c <= 122)   //a - z
            || (c >= 65 && c <= 90)    //A - Z
            || (c >= 48 && c <= 57)    //0 - 9
            || (c == 36) || (c == 95)  //$, _
            || (c == 45) || (c == 58); //-, : 
    },

    isIdentifier: function (c) {
        return (c >= 97 && c <= 122)   //a - z
            || (c >= 65 && c <= 90)    //A - Z
            || (c >= 48 && c <= 57)    //0 - 9
            || (c == 36) || (c == 95); //$, _
    },

    isSeparator: function (c) {
        return (c == 46); //.
    },

    findIdentifiers: function (str, start) {
        var p = start || 0, l = p; 
        const result = [];

        while (p < str.length) {
            const t = this.nextTokenPosition(str, p, this.isIdentifier);
            if (t == undefined) {
                break;
            }
            else {
                l = t;
            }
            
            p = t;

            do {
                var isValid = this.isIdentifier(str.charCodeAt(p)) || this.isSeparator(str.charCodeAt(p));
            } while (p++ < str.length && isValid == true);
            
            const name = str.substring(l, (p - 1));
            result.push({ 
                name: name,
                parentName: this.getParentObjectName(name),
                propertyName: this.getPropertyName(name)
             });
        }
        
        return result;
    },

    textExpression: function (text) {
        const expressions = []; 
        var pos = 0;
        
        do {
            const posStart = this.nextTokenPosition(text, pos, '{{');
            if (posStart == undefined) {
                break;
            }
            
            var posEnd = this.nextTokenPosition(text, posStart, '}}');
            if (posEnd == undefined) {
                break;
            }

            posEnd += 2;
            
            expressions.push({ text: text.substring(pos, posStart) });
            
            const expression = text.substring(posStart + 2, posEnd - 2);
                
            const expressionDescriptor = {
                expression,
                identifiers: this.findIdentifiers(expression)
            };
            
            expressions.push(expressionDescriptor);
            
            pos = posEnd;
        } while (pos < text.length);

        expressions.push({ text: text.substr(pos) });
        
        return expressions;
    },

    eventHandlerExpression: function (value) {
        const pos = core.nextTokenPosition(value, 0, '(');
        
        if (pos == undefined) {
            return { handler: null, parameter: null };
        }

        const handler = value.substring(0, pos);
        
        const posEnd = core.nextTokenPosition(value, pos, ')');

        if (posEnd == undefined) {
            return { handler: null, parameter: null };
        }

        const parameter = value.substring(pos + 1, posEnd).trim();

        return { handler, parameter };
    },

    getAllObjectNames: function (name) {
        const result = [];
        const names = name.split('.');
        for (var i = 0; i < names.length - 1; i++) {
            var n = names[0];
            for (var j = 1; j <= i; j++) {
                n = n + '.' + names[j];
            }

            result.push(n);
        }

        return result;
    },

    getParentObjectName: function (name) {
        const lastObjectSeparatorIndex = name.lastIndexOf('.');
        if (lastObjectSeparatorIndex > -1) {
            return name.substr(0, lastObjectSeparatorIndex);
        }

        return name;
    },

    getPropertyName: function (name) {
        const lastObjectSeparatorIndex = name.lastIndexOf('.');
        if (lastObjectSeparatorIndex > -1) {
            return name.substr(lastObjectSeparatorIndex + 1);
        }

        return undefined;
    },

    virtualContext: function ($e, controller, propArray) {
        const BINDING_TYPE_FOR_ITEM = core.defineConstant('BINDING_TYPE_FOR_ITEM');
        const values = [];
    
        //collect controller properties
        const properties = Object.getOwnPropertyNames(controller)
            .concat(Object.getOwnPropertyNames(Object.getPrototypeOf(controller)))
            .filter(n => 
                core.isFunction(controller[n]) == false
            );

        for (var i = 0; i < properties.length; i++) {
            values.push(controller[properties[i]]);
        }

        //collect for-scope parameters/values
        var $cur = $e;
        do {
            const bindingData = core.getBindingData($cur, BINDING_TYPE_FOR_ITEM);
            if (bindingData) {
                properties.push(bindingData.scopeName);
                values.push(bindingData.value);
            }

            $cur = $cur.parentNode;
        } while ($cur);
        
        //collect additional properties
        for (var i = 0; i < (propArray || []).length; i += 2) {
            properties.push(propArray[i + 0]);
            values.push(propArray[i + 1]);
        }

        //collect function internals
        properties.push('_expression');
        properties.push('_callback');

        //last parameter is function body
        properties.push('return eval(_expression);');

        return { 
            values: values,
            f: Function.constructor.apply(undefined, properties),
            exec: function (expression, callback) {
                return this.f.apply(undefined, this.values.concat(expression).concat(callback));
            }
        };
    },
    
    ignoreTagNames: { 'STYLE': true, 'SCRIPT': true },

    bindingsConnect: function (controller, $e) {
        this.traverse($e, ($e, level) => {
            if (core.ignoreTagNames[$e.tagName] === true) {
                return core.TRAVERSE_NODE_SKIP;
            }
            
            //node handler
            for (var j = 0; j < this.nodeHandler.length; j++) {
                if (this.nodeHandler[j].can($e) != true) {
                    continue;
                }
                
                if (this.nodeHandler[j].handle([], $e, controller) === false) {
                    return;
                }
            }
            
            if (!$e.attributes) {
                return;
            }
            
            //attr handler
            for (var i = 0; i < $e.attributes.length; i++) {
                const name = $e.attributes[i].name;
                const value = $e.attributes[i].value;
                
                for (var j = 0; j < this.attrHandler.length; j++) {
                    if (this.attrHandler[j].can($e, controller, name, value) != true) {
                        continue;
                    }
    
                    const result = this.attrHandler[j].handle([], $e, controller, name, value);
                    if (result === false) {
                        return core.TRAVERSE_NODE_SKIP;
                    }
                    else if (result === true) {
                        break;
                    }
                }
            }
        });
    },

    bindingsDisconnect: function ($e) {
        this.inverse($e, ($e, level) => {
            if ($e.nodeType != Node.ELEMENT_NODE) {
                return;
            }

            if (core.ignoreTagNames[$e.tagName] === true) {
                return;
            }

            ($e[this.BINDINGS_PROPERTY_NAME] || []).forEach(b => b.destroy());
        });
    },

    addNodeHandler: function (handlerObject) {
        this.nodeHandler.push(handlerObject);
    },

    addAttrHandler: function (handlerObject) {
        this.attrHandler.push(handlerObject);
        this.attrHandler.sort((i0, i1) => (i1.priority || 0) - (i0.priority || 0))
    },

    addIoHandler: function (handlerObject) {
        this.ioHandler.push(handlerObject);
    },

    template: function ($n, model) {
        var tagName = 'div';
        if ($n.tagName == 'TR') {
            tagName = 'table';
        }

        const $t = document.createElement(tagName);
        $t.innerHTML = $n.outerHTML;
        const $e = $n.tagName == 'TR' ? $t.children[0].children[0] : $t.children[0];
        $e.parentElement.removeChild($e);
        
        if (model == undefined) {
            return $e;
        }

        this.traverse($e, ($e) => {
            if ($e.nodeType != Node.ELEMENT_NODE 
                || customElements.get($e.tagName.toLowerCase()) == undefined) {
                return core.TRAVERSE_NODE_STOP;
            }

            if ($e.model == null) {
                $e.model = model;
            }
        });

        return $e;
    }
};

//handler
core.addAttrHandler({
    can: function ($e, controller, name, value) {
        return name.startsWith('#') == true
    },

    handle: function (bindings, $e, controller, name, value) {
        if (name.startsWith('#')) {
            controller[name.substr(1)] = $e;
            return true;
        }
    }
});

const styleSheets = {};
const STYLE_SHEET_DEFINED = 0;
const STYLE_SHEET_LOADING = 1;
const STYLE_SHEET_LOADED = 2;

const _loadSheet = function (sheet, resolve) {
    sheet.status = STYLE_SHEET_LOADING;
    fetch(sheet.url).then(f => f.text()).then(text => {
        const cssStyleSheet = new CSSStyleSheet();
        cssStyleSheet.replaceSync(text);
        sheet.sheet = cssStyleSheet;
        sheet.status = STYLE_SHEET_LOADED;
        resolve(sheet);
    });
};

//library
export const $p = {
    bind: function (controller, $e) {
        if (controller.model) {
            controller.model = _proxify(controller.model, 'model');
            //_propertyListen(controller, 'model');
        }
        
        (Array.isArray($e) ? $e : [$e]).forEach($e => core.bindingsConnect(controller, $e));
        
        return $e;
    },

    unbind: function ($e) {
        (Array.isArray($e) ? $e : [$e]).forEach($e => core.bindingsDisconnect($e));
    },

    components: {
        core: function (f) {
            f(core);
        }
    },
    
    event: {
        one: function ($e, eventName, handler, options) {
            var innerHandler = function (e) {
                if (options) {
                    $e.removeEventListener(eventName, innerHandler, options);
                }
                else {
                    $e.removeEventListener(eventName, innerHandler);
                }
                
                handler(e);
            };

            if (options) {
                $e.addEventListener(eventName, innerHandler, options);
            }
            else {
                $e.addEventListener(eventName, innerHandler);
            }
        }
    },

    dom: {
        value: function ($e) {
            return core.getBindingData($e)?.value;
        },
        
        template: function ($n, model) {
            return core.template($n, model);
        },

        styleSheet: function (url, name) {
            if (styleSheets[name] == undefined) {
                styleSheets[name] = { url, status: STYLE_SHEET_DEFINED, sheet: null, promise: null };
            }
            else {
                throw new Error('StyleSheet name already defined -> ' + name);
            }
        },

        appendSheet: function (root) {
            var promises = [];

            for (var i = 1; i < arguments.length; i++) {
                const sheet = styleSheets[arguments[i]];

                if (sheet == undefined) {
                    throw new Error('StyleSheet name not defined -> ' + arguments[i]);
                }

                if (sheet.status == STYLE_SHEET_LOADING) {
                    promises.push(sheet.promise);
                }
                else {
                    sheet.promise = new Promise((resolve, reject) => {
                        if (sheet.status == STYLE_SHEET_LOADED) {
                            resolve(sheet);
                        }
                        else if (sheet.status == STYLE_SHEET_DEFINED) {
                            _loadSheet(sheet, resolve);
                        }
                    });
                }

                promises.push(sheet.promise);
            }

            Promise.all(promises).then(sheets => {
                root.adoptedStyleSheets = sheets.map(s => s.sheet);
            });
        },

        insertAfter: function ($e, $ref) {
            core.insertAfter($e, $ref);
        }
    },

    array: {
        removeAll: function (array, predicate, thisArg) {
            core.arr.removeAll(array, predicate, thisArg);
        }
    }
};

//proxy
const _proxyReferences = new WeakSet();

const _proxyHandlerSet = function (obj, prop, value, listener, set) {
    const isSilent = (value instanceof core.cstr.silent);
    const oldValue = obj[prop];

    var v = (isSilent == true) ? value.value : value;

    if (typeof v === 'object') {
        v = _proxify(v);
    }
    
    set(v);

    if (isSilent == true && value.listener == undefined) {
        return true;
    }

    ([].concat(listener)).forEach(l => {
        if (isSilent == true && value.listener.findIndex(l0 => l0 === l) > -1) {
            return;
        }

        if (l.propertyName && l.propertyName != prop) {
            return;
        }

        l.callback('set', obj, prop, v, oldValue);
    });

    return true;
};

const _proxyHandlerDelete = function (obj, prop, listener) {
    if (prop in obj) {
        const oldValue = obj[prop];
        delete obj[prop];

        listener.forEach(l => {
            l.callback('delete', obj, prop, undefined, oldValue);
        });
        
        return true;
    }

    return false;
};

const _extendObserver = function (obj, listener) {
    const _observe = function (callback, propertyName) {
        //move listener
        if (arguments.length == 1 && arguments[0] instanceof ProxyListener) {
            listener.push(arguments[0]);
            return arguments[0];
        }

        //new listener
        if (listener.findIndex(l => l.callback == callback
            && (l.propertyName == undefined || l.propertyName == propertyName)) > -1) {
            return;
        }

        const proxyListener = new core.cstr.listener(callback, this, propertyName);

        listener.push(proxyListener);

        return proxyListener;
    };
    
    const _unobserve = function (proxyListener) {
        var index = listener.findIndex(l => (l == proxyListener));
        if (index > -1) {
            listener.splice(index, 1);
        }
    };
    
    const _unwrap = function (filter) {
        return core.copy(this, filter);
    };

    if (_proxyReferences.has(obj) == true) {
        obj._observe = new core.cstr.silent(_observe);
        obj._unobserve = new core.cstr.silent(_unobserve);
        obj._unwrap = new core.cstr.silent(_unwrap);
    }
    else {
        obj._observe = _observe;
        obj._unobserve = _unobserve;
        obj._unwrap = _unwrap;
    }
};

const _proxify = function (obj) {
    if (_proxyReferences.has(obj)) {
        return obj;
    }

    for (var i in obj) {
        if (obj[i] != null && obj[i] != undefined && typeof(obj[i]) == 'object') {
            obj[i] = _proxify(obj[i]);
        }
    }

    const listener = [];
    const handler = {
        get: function (target, prop, receiver) {
            return Reflect.get(...arguments);
        },

        set: function (obj, prop, value) {
            return _proxyHandlerSet(obj, prop, value, listener, (v) => obj[prop] = v);
        },

        deleteProperty: function (obj, prop) {
            return _proxyHandlerDelete(obj, prop, listener);
        }
    };

    if (obj._observe || obj._unobserve || obj._unwrap) {
        throw new Error('Object can not have method _observe/_unobserve/_unwrap');
    }

    const proxy = new Proxy(obj, handler);

    _proxyReferences.add(proxy);

    _extendObserver(proxy, listener);

    return proxy;
};

const _propertyListen = function (obj, propertyName) {
    const listener = [];
    var val = obj[propertyName];

    if (obj._observe || obj._unobserve || obj._unwrap) {
        throw new Error('Object can not have method _observe/_unobserve/_unwrap');
    }

    Object.defineProperty(obj, propertyName, {
        get: function () {
            return val;
        },

        set: function (value) {
            _proxyHandlerSet(this, propertyName, value, listener, (v) => val = v);
        },

        enumerable: true,

        configurable: false
    });

    _extendObserver(obj, listener);
};

//exception, error
const fatal = function (e) {
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.padding = '12px';
    document.body.style.backgroundColor = 'royalblue'
    document.body.style.fontSize = '24px';
    document.body.style.color = 'white';
    document.body.innerHTML = '<div></div><div style="margin-top: 14px;"></div>';
    document.body.children[0].innerText = e.message;
    document.body.children[1].innerText = e.stack;
};

//import
var loadRefCounter = 1; //DOMContentLoaded
const importCoreModule = function (str) { 
    loadRefCounter++; 
    
    import(str).then(function() { 
        loadRefCounter--;
        loadCallback();
    }).catch(function(e) {
        fatal(e);
    });

    return p;
};

(function () {
    try { importCoreModule('./text-binding.js'); } catch { }
    try { importCoreModule('./for-binding.js'); } catch { }
    try { importCoreModule('./style-binding.js'); } catch { }
    try { importCoreModule('./model-binding.js'); } catch { }
    try { importCoreModule('./event-binding.js'); } catch { }
    try { importCoreModule('./attribute-binding.js'); } catch { }
})();

//load
var load = null;
const loadCallback = function() {
    if (loadRefCounter == 0 && load) {
        load();
    }
};

const domComntentLoaded = function() {
    window.removeEventListener('DOMContentLoaded', domComntentLoaded);
    loadRefCounter--;
    loadCallback();
};

window.addEventListener('DOMContentLoaded', domComntentLoaded);

export const $pLoad = function (callback) {
    load = callback;
    loadCallback();
};