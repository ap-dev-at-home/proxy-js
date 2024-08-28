### Beta/Evaluation-Warning ⚠️

Proxy-JS is an experimental library intended for my personal technical education/training only. I started Proxy-JS as an endeavour to evaluate the utilizability of ES6-Proxies for Javascript data binding. __BUT__ it is __NOT__ safe, tested or final for production environment or any other purpose.

### Proxy-JS - A primitive Javascript data binding library

- Few APIs
- No buildsteps
- Based on well known Javascript/HTML5 Concepts 
    - WebComponents
    - Proxies
    - Others...
- Binding Html-Resources to WebComponents
- Managing resources like
    - Css
    - Html-Templates

### Webcomponent example

```html
<!--hello-world.html-->

<div class="text-clickable">
    <span @click="onClick(e)">{{model.title}}<br>Clicked {{model.count}} times (Click me)</span>
</div>
```

```css
/*hello-world.css*/

.text-clickable {
    cursor: pointer;
    user-select: none;
    transition: text-shadow 0.25s;
}

.text-clickable:hover {
    text-shadow: 0 0 5px lightgrey;
}
```

```javascript
import { $p, $pLoad } from '../proxy-js/core.js';
import { $pResource } from '../proxy-js/request.js';

class HelloWorld extends HTMLElement {

    model = {
        title: 'WebComponent - Hello World',
        count: 0
    };

    constructor() {
        super();

        this.attachShadow({ mode: 'open', delegatesFocus: true });

        $p.dom.appendSheet(this.shadowRoot, 'hello');
    }

    async connectedCallback() {
        var $template = await $pResource('./resource/hello-world.html'); 

        $template.bind(this)
            .appendTo(this.shadowRoot);
    }

    onClick(e) {
        ++this.model.count;
    }
}

$pLoad(() => {
    customElements.define('hello-world', HelloWorld);

    $p.dom.styleSheet('./css/hello-world.css', 'hello');

    document.querySelector('.layout-center')
        .appendChild(document.createElement('hello-world'));
});
```

### API Calls (most relevant)

| Import/Call | Description | Parameter |
| ------- | -------- |----------- |
|$pLoad(`callback`)  | `callback` called when document is ready and proxy-js is load | `callback` - parameterless function | 
| $template | _Type_ | Represents a html-resource |
| $pResource(`url`) <br> _`returns`_ - promise resolving to a `$template` | Fetch and cache a html-resource (_awaitable method_) | `url` - address to the html-resource |
| $template.bind(`webcomponent`) <br> _`returns`_ - the `$template` | Binds a `$template` to the model of a webcomponent | `webcomponent` - the webcomponent object |
| $template.appendTo(`$element`) <br> _`returns`_ - the `$template` | Appends the `$template` to a DOM `$element` | `$element` - DOM element|
| $p | Global library object | Provides access to the libraries functions and core |
| $p.bind(`webcomponent`, `$template`) | Bind `$template` to the model of a webcomponent | `webcomponent` - the webcomponent object <br> `$template` - html-resource |
| $p.dom.styleSheet(`url`, `name`) | Maps the stylesheet at `url` to a `name` | `url` - adress to a stylesheet <br> `name` - name to map the stylesheet |
| $p.dom.appendSheet(`shadowRoot`, `name1, ...nameX`) | Append stylesheets to the `shadowRoot` of a webcomponent | `shadowRoot` - shadowRoot of a Webcomponent <br> `name1...nameX` - Names of the mapped stylesheets to append  |

### Binding Attributes

| Syntax | Type | Description | Parameter |
| -------------- | ---- | ----------- | ------- |
| #`name` | Element binding  | Creates member `name` referencing the declaring element | - |
| :class="{ `'class-name'`: `model.selected`, ... }" | Class binding | `class-name` applies when right hand expression evaluates true | `'class-name'`: `expression` |
| :style="{ `'display'`: `model.show ? 'block' : 'none'` }" | Style binding | `style` evaluates to right hand expression | `'styleproperty'`: `expression` |
| :disabled="`model.disabled ? 'disabled' : undefined`" | Attribute binding | Evaluates to the right hand expression, removed when expression is undefined | `expression` |
| p-model="model.title" | Model binding for inputs | Binds the value of an $input element (text, checkbox) | - |
| p-for="`book` in `model.books`" | Iterative binding | Repeats an element from the objects of an array. <br> The objects in the array will be the models of the webcomponents created by the binding | `name` in `array` |
| @`event`="`callback`(`$e`, `e`, `item`)" | Event binding | Binds an `event` to a `callback` with optional parameters | `@event` - name of the event (e.g. click) <br><br>`callback` - name of the callback methd<br><br> `$e` - target or delegate $element <br><br> `e` - event <br><br> `item` - name of a for-item (e.g. book) |
| @`event`.`modifier`&`selector`=... | Event binding | Binds an `event` with optional modifiers and/or selector | `@event` - name of the event (e.g. click) <br><br> `modifier` - can be <br> - once <br> - capture <br><br>`selector` - a valid css selector |

### API Calls (advanced)

| Call | Description | Parameter |
| ------- | -------- |----------- |
| $p.unbind(`$e`) <br> *- removing elements without unbinding causes memory leaks* | Recursively removes all bindings within `$e` and its descendants | `$e` - element to unbind |
| ... = new SilentValue(`value`, `listener`) | Assigning a value without triggering the watchers | `value` - the value to assign <br><br> `listener` - optional filter array to ignore only specific listener |
| $p.events.one(`$e`, `eventName`, `handler`, `options`) | Registers an event handler which is unregistered after occuring once | `$e` - the element to register an event for <br><br> `eventName` - the name of the event to listen for <br><br> `handler` - event receiver function <br><br> `options` - event listening options | 
| $p.dom.value(`$e`) | Returns the raw binding object data | `$e` - the element to get the binding data for |
| $p.components.core(`f`) <br> ⚠️💀⚠️ - *core implementation can be changed, overriden or manipulated using this call* | Calls `f` passing the core implementation | `f` - a function of signature f(core) - where core is the inner core implementation |

### Core API

| Call (on `core`) | Description | Parameter |
| ------- | -------- |----------- |
| defineConstant(`name`) <br>*`returns` - the names constant id* | Maps a constant id to `name` | `name` - name of the constant | 
| traverse(`$e`, `callback`) | Recursively passes `$e` and all descendant nodes to `callback($e)` where `$e` is the currently traversed node. <br><br> Return values of `callback($e)`: <br> `TRAVERSE_NODE_SKIP` - Skip descendants of `$e` <br> `TRAVERSE_NODE_STOP` - Stop traversing | `$e` - the element to traverse <br><br> `callback` - a function of signature callback($e) |
| inverse(`$e`, `callback`) | Innermost first recursively passes all descendant nodes of `$e` to `callback($e)` where `$e` is the currently inversed node. <br><br> After all inversing, `$e` is passed to `callback` | `$e` - the element to inverse <br><br> `callback` - a function of signature callback($e) |
| copy(`value`) <br> *`returns` - deep copy of `value`* | Recursively creates a deep copy of `value` trying to resolve circular references | `value` - the object or array to deep copy |
|more...|||

<br>

### Current work in progress...experimental features i am working at
----
### I/O Handler - Define binding behaviour

```javascript
$p.components.core(function (core) { //add a core component
    core.addIoHandler({ //define io handler
        name: 'dateformat',

        out: function (value, ...params) { //out to dom
            //TODO date value to string
        },

        in: function (value, ...params) { //in from dom
            //TODO string date to date
        }
    });

    core.addIoHandler({
        name: 'filesize',

        out: function (value, ...params) {
            if (value < 1024) {
                return value + ' byte';
            }

            var i = 1;
            while (i <= 4 && (value / Math.pow(1024, i)) > 1024) {
                i++;
            }

            var units = [null, 'KB', 'MB', 'GB', 'TB'];

            return parseFloat((value / Math.pow(1024, i))).toFixed(2) + ' ' + units[i];
        },

        in: function (value, ...params) {

        }
    });
});
```

```html
<div class="file-item-size">{{$filesize(model.size)}}</div>
```

```html
<div class="file-item-date">{{$dateformat(model.changed)}}</div>
```
<br>

### Dynamic For Templates - Determine for binding webcomponent at runtime

```html
<div class="pnl-task">
    <!--template is not rendered, onTaskComponent returns the name of a webcomponent-->
    <template p-for="task in model.tasks" p-component="onTaskComponent()"></template>
    <!--onTaskComponent is called for every for-item-->
</div>
```

```javascript
//return the name of a webcomponent to use for the current for binding item
onTaskComponent(task) { 
    if (task.type == TASK_TYPE_NOTE) {
        return 'task-note'; //use task-note Webcomponent
    }
    else if (task.type == TASK_TYPE_TODO) {
        return 'task-todo'; //use task-todo Webcomponent
    }
}
```
