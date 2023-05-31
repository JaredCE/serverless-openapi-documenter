'use strict'

const https = require('https')

const defaultOWASP = require('../json/owasp.json')

/**
 * @typedef {Object} Header
 * @property {string} name - The name of the header
 * @property {string} value - The default value of the header
 */

/**
 * @typedef {Object} OWASPHeaders
 * @property {string} last_update_utc - When the headers were last updated in UTC
 * @property {Array.<Header>} headers - An array of headers
 */

class OWASP {
    constructor() {
        this.DEFAULT_OWASP_HEADERS = {
            "Cache-Control": {
                description: 'The Cache-Control HTTP header field holds directives (instructions) — in both requests and responses — that control [caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching) in browsers and shared caches (e.g. Proxies, CDNs). - [MDN Link](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)',
            },
            "Clear-Site-Data": {
                description: 'The Clear-Site-Data header clears browsing data (cookies, storage, cache) associated with the requesting website. It allows web developers to have more control over the data stored by a client browser for their origins. - [MDN Link](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Clear-Site-Data)',
            },
            "Content-Security-Policy": {
                description: 'The HTTP Content-Security-Policy response header allows website administrators to control resources the user agent is allowed to load for a given page. With a few exceptions, policies mostly involve specifying server origins and script endpoints. This helps guard against cross-site scripting attacks ([Cross-site scripting](https://developer.mozilla.org/en-US/docs/Glossary/Cross-site_scripting)). - [MDN Link](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy)',
            },
            "Cross-Origin-Embedder-Policy": {
                description: 'The HTTP Cross-Origin-Embedder-Policy (COEP) response header configures embedding cross-origin resources into the document. - [MDN Link](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy)',
            },
            "Cross-Origin-Opener-Policy": {
                description: 'The HTTP Cross-Origin-Opener-Policy (COOP) response header allows you to ensure a top-level document does not share a browsing context group with cross-origin documents. - [MDN Link](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy)',
            },
            "Cross-Origin-Resource-Policy": {
                description: 'Cross-Origin Resource Policy is a policy set by the Cross-Origin-Resource-Policy HTTP header that lets websites and applications opt in to protection against certain requests from other origins (such as those issued with elements like <script> and <img>), to mitigate speculative side-channel attacks, like Spectre, as well as Cross-Site Script Inclusion attacks. - [MDN Link](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Resource-Policy)',
            },
            "Permissions-Policy": {
                description: 'The HTTP Permissions-Policy header provides a mechanism to allow and deny the use of browser features in a document or within any [<iframe>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe) elements in the document. - [MDN Link](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy)',
            },
            "Pragma": {
                description: 'The Pragma HTTP/1.0 general header is an implementation-specific header that may have various effects along the request-response chain. This header serves for backwards compatibility with the HTTP/1.0 caches that do not have a [Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control) HTTP/1.1 header. - [MDN Link](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Pragma)',
                deprecated: true,
            },
            "Referrer-Policy": {
                description: 'The Referrer-Policy [HTTP header](https://developer.mozilla.org/en-US/docs/Glossary/HTTP_header) controls how much [referrer information](https://developer.mozilla.org/en-US/docs/Web/Security/Referer_header:_privacy_and_security_concerns) (sent with the [Referer](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referer) header) should be included with requests. Aside from the HTTP header, you can [set this policy in HTML](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy#integration_with_html). - [MDN Link](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy)',
            },
            "Strict-Transport-Security": {
                description: 'The HTTP Strict-Transport-Security response header (often abbreviated as [HSTS](https://developer.mozilla.org/en-US/docs/Glossary/HSTS)) informs browsers that the site should only be accessed using HTTPS, and that any future attempts to access it using HTTP should automatically be converted to HTTPS. - [MDN Link](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security)',
            },
            "X-Content-Type-Options": {
                description: 'The X-Content-Type-Options response HTTP header is a marker used by the server to indicate that the [MIME types](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types) advertised in the [Content-Type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type) headers should be followed and not be changed. The header allows you to avoid [MIME type sniffing](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types#mime_sniffing) by saying that the MIME types are deliberately configured. - [MDN Link](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options)',
            },
            "X-Frame-Options": {
                description: 'The X-Frame-Options [HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP) response header can be used to indicate whether or not a browser should be allowed to render a page in a [<frame>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/frame), [<iframe>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe), [<embed>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/embed) or [<object>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/object). Sites can use this to avoid [click-jacking](https://developer.mozilla.org/en-US/docs/Web/Security/Types_of_attacks#click-jacking) attacks, by ensuring that their content is not embedded into other sites. - [MDN Link](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options)',
            },
            "X-Permitted-Cross-Domain-Policies": {
                description: "A cross-domain policy file is an XML document that grants a web client, such as Adobe Flash Player or Adobe Acrobat (though not necessarily limited to these), permission to handle data across domains. When clients request content hosted on a particular source domain and that content makes requests directed towards a domain other than its own, the remote domain needs to host a cross-domain policy file that grants access to the source domain, allowing the client to continue the transaction. Normally a meta-policy is declared in the master policy file, but for those who can't write to the root directory, they can also declare a meta-policy using the X-Permitted-Cross-Domain-Policies HTTP response header. - [OWASP Link](https://owasp.org/www-project-secure-headers/#x-permitted-cross-domain-policies)",
            }
        }

        this.headerMap = {
            cacheControl: 'Cache-Control',
            clearSiteData: 'Clear-Site-Data',
            contentSecurityPolicy: 'Content-Security-Policy',
            crossOriginEmbedderPolicy: 'Cross-Origin-Embedder-Policy',
            crossOriginOpenerPolicy: 'Cross-Origin-Opener-Policy',
            crossOriginResourcePolicy: 'Cross-Origin-Resource-Policy',
            permissionsPolicy: 'Permissions-Policy',
            pragma: 'Pragma',
            referrerPolicy: 'Referrer-Policy',
            strictTransportSecurity: 'Strict-Transport-Security',
            xContentTypeOptions: 'X-Content-Type-Options',
            xFrameOptions: 'X-Frame-Options',
            xPermittedCrossDomainPolicies: 'X-Permitted-Cross-Domain-Policies'
        }
    }

    async getLatest() {
        const headerJSON = await new Promise((resolve, reject) => {
            const req = https.get('https://owasp.org/www-project-secure-headers/ci/headers_add.json', (res) => {
                let data = []

                if (res.statusCode !== 200) {
                    resolve(defaultOWASP)
                }

                res.on('error', (err) => {
                    resolve(defaultOWASP)
                })

                res.on('data', (chunk) => {
                    data.push(chunk)
                })

                res.on('end', () => {
                    resolve(JSON.parse(Buffer.concat(data).toString()))
                })
            })
                .on('error', (err) => {
                    resolve(defaultOWASP)
                })

            req.end()
        })

        this.populateDefaults(headerJSON)
    }

    /**
     * @funtion populateDefaults
     * @param {OWASPHeaders} headerJSON
     */
    populateDefaults(headerJSON) {
        for (const header of headerJSON.headers) {
            if (this.DEFAULT_OWASP_HEADERS?.[header.name]) {
                Object.assign(this.DEFAULT_OWASP_HEADERS[header.name], {schema: {type: 'string', default: header.value}})
            } else {
                Object.assign(this.DEFAULT_OWASP_HEADERS, {[header.name]: {schema: {type: 'string', default: header.value}}})
            }
        }
    }

    getHeaders(headerList) {
        const obj = {}
        for (const headerName of Object.keys(headerList)) {
            const defaultHeader = this.DEFAULT_OWASP_HEADERS[this.headerMap[headerName]]
            Object.assign(obj, {[this.headerMap[headerName]]: defaultHeader})

            if (typeof headerList[headerName] !== 'boolean') {
                obj[this.headerMap[headerName]].schema.default = headerList[headerName].value
            }
        }

        return obj
    }
}

module.exports = new OWASP()
