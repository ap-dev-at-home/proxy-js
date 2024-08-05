import { $p } from './core.js'

const req = {};

export async function $pResource(url) {
    return req.resource(url);
}

export const $pRequestOptions = {
    requestHeaders: {},

    requestCallback: function (xhr) {

    }
};

export function $pRequest(opts) {
    return new Promise(function (resolve, reject) {
        const xhr = new XMLHttpRequest();

        xhr.open(opts.method, opts.url);
        
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                var contentTypeHeader = this.getResponseHeader('content-type');
                var isJson = contentTypeHeader && contentTypeHeader.indexOf('application/json') > -1;
                resolve(isJson ? JSON.parse(this.response) : this.response);
            } else {
                reject({
                    aborted: false,
                    status: this.status,
                    statusText: this.statusText,
                    response: this.response,
                    responseText: this.responseText,
                    responseURL: this.responseURL
                });
            }
        };

        xhr.onerror = function () {
            reject({
                aborted: false,
                status: this.status,
                statusText: this.statusText,
                response: this.response,
                responseText: this.responseText,
                responseURL: this.responseURL
            });
        };

        xhr.onabort = function () {
            reject({
                aborted: true,
                status: this.status,
                statusText: this.statusText,
                response: this.response,
                responseText: this.responseText,
                responseURL: this.responseURL
            });
        }

        if (opts.headers) {
            Object.keys(opts.headers).forEach(function (key) {
                xhr.setRequestHeader(key, opts.headers[key]);
            });
        }

        if (opts.token) {
            opts.token.add(() => { xhr.abort(); });
        }

        Object.keys($pRequestOptions.requestHeaders).forEach(function (key) {
            xhr.setRequestHeader(key, $pRequestOptions.requestHeaders[key]);
        });
        
        $pRequestOptions.requestCallback(xhr);

        xhr.send(opts.data ? JSON.stringify(opts.data) : undefined);
    });
};

export class Resource {
    #elements = [];

    constructor(elements) {
        this.#elements = elements;
    }

    bind(controller) {
        $p.bind(controller, this.#elements);

        return this;
    }

    appendTo(target) {
        this.#elements.forEach(($e) => {
            target.appendChild($e);
        });

        return this;
    }
}

$p.components.core(function (core) {
    const resources = {};
    const resourcesPromise = {};

    const $pTemplate = function (elements, model) {
        const result = [];
        
        elements.forEach($e => {
            if ($e.nodeType == Node.ELEMENT_NODE) {
                result.push(core.template($e, model));
            }
            else {
                result.push($e.cloneNode(true));
            }
        });

        return new Resource(result);
    };
    
    req.resource = async function (url) {
        const mdl = Array.prototype.find.call(arguments, (a, i) => i > 0 && core.isDOM(a) == false);
        
        if (resourcesPromise[url]) {
            return new Promise((resolve, reject) => resourcesPromise[url].then(() => resolve($pTemplate(resources[url], mdl))));
        }
        else if (resources[url]) {
            return new Promise((resolve, reject) => resolve($pTemplate(resources[url], mdl)));
        }
        
        const promise = resourcesPromise[url] = new Promise(async (resolve, reject) => {
            fetch(url).then(async f => {
                const html = await f.text();

                const $template = document.createElement('template');
                $template.innerHTML = html;

                const elements = [];
                Array.prototype.forEach.call($template.content.childNodes, $e => {
                    elements.push($e);
                });

                resources[url] = elements;

                elements.forEach($e => {
                    $template.content.removeChild($e);
                });

                delete resourcesPromise[url];

                resolve($pTemplate(resources[url], mdl));
            }).catch (() => {
                reject();
            });
        });
        
        return promise;
    };
});