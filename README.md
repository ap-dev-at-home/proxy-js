### Beta/Evaluation-Warning ⚠️

This is a library is for my personal technical education/training only. I started Proxy-JS as an experimental library, sometimes using it for non-critical private applications or prototyping. __BUT__ it is __NOT__ safe, tested or final for production environment or any other purpose.

### Proxy-JS - A primitive library to evaluate Javascript binding with proxies

- Few APIs
- No buildsteps
- Based on well known Javascript/HTML5 Concepts (WebComponents, Proxies)
- Lightweight
- Based on some of the radical simplicity paradigm I found [here](https://www.radicalsimpli.city/)
    - Radical Simplicity takes away all the technology that doesn’t deliver customer value.
    - Radical Simplicity leads to deep domains and deep tech.
    - Radical Simplicity leads to higher quality.
    - Radical Simplicity makes it easy for new developers to understand a system.
    - Radical Simplicity makes setting up and testing easy.
    - Radical Simplicity puts you back in control.

### Proxy-JS aims to make easy

- Managing resources like css, html-templates
- Binding html-resources to webcomponents

<br>

### Webcomponent example

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

<br>

### API Calls

| Import | Description | Parameter |
| ------- | -------- |----------- |
|$pLoad(`callback`)  | callback called when document is ready and proxy-js is load | `callback` - parameterless function | 
| $template | _Type_ | Represents a html-resource |
| $pResource(`url`) <br> _`returns`_ - promise resolving to a `$template` | Fetch and cache a html-resource (_awaitable method_) | `url` - address to the html-resource |
| $template.bind(`webcomponent`) <br> _`returns`_ - the `$template` | Binds a `$template` to the model of a webcomponent | `webcomponent` - the webcomponent object |
| $template.appendTo(`$element`) <br> _`returns`_ - the `$template` | Appends the `$template` to a DOM `$element` | `$element` - DOM element|
| $p | Global library object | Provides access to the libraries functions and core |
| $p.bind(`webcomponent`, `$template`) | Bind `$template` to the model of a webcomponent | `webcomponent` - the webcomponent object <br> `$template` - html-resource |
| $p.dom.styleSheet(`url`, `name`) | Map a stylesheet to a `name` | `url` - adress to a stylesheet <br> `name` - name to map the stylesheet |
| $p.dom.appendSheet(`shadowRoot`, `name1, ...nameX`) | Append stylesheets to the `shadowRoot` of a webcomponent | `shadowRoot` - shadowRoot of a Webcomponent <br> `name1...nameX` - Names of the mapped stylesheets to append  |

<br>

### Binding Attributes

| Syntax | Type | Description | Parameter |
| -------------- | ---- | ----------- | ------- |
| #`name` | Element binding  | Creates member `name` referencing the declaring element | - |
| :class="{ `'class-name'`: `model.selected`, ... }" | Class binding | `class-name` applies when right hand expression evaluates true | `'class-name'`: `expression` |
| :style="{ `'display'`: `model.show ? 'block' : 'none'` }" | Style binding | `style` evaluates to right hand expression | `'styleproperty'`: `expression` |
| :disabled="`model.disabled ? 'disabled' : undefined`" | Attribute binding | Evaluates to the right hand expression, removed when expression is undefined | `expression` |
| p-model="model.title" | Model binding for inputs | Binds the value of an $input element (text, checkbox) | - |
| p-for="`book` in `model.books`" | Iterative binding | Repeats an element from the objects of an array. <br> The objects in the array will be the models of the webcomponents created by the binding | `name` in `array` |
| @`event`="`callback`(`$e`, `e`, `item`)" | Event binding | Binds an `event` to a `callback` with optional parameter | `@event` - name of the event (e.g. click) <br>`callback` - name of the callback methd<br> `$e` - target or delegate $element <br> `e` - event <br> `item` - name of a for-item (e.g. book) |

<br>

----
### Current work in progress...experimental features i am working at
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

### Delegate Event - Receive event matched by a selector

```html
<!--only handle events matching a selector-->
<div @click&selector="onClickItem($e)"></div>
```

### Delegate for-item - Receive delegated event paramters

```html
<!--receive the for-items model in a delegate event-handler-->
<div @click&selector="onClickItem($e, e, task)"></div>
```


