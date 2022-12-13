'use strict'

const path = require('path')

const { v4: uuid } = require('uuid')
const validator = require('oas-validator');
const SchemaConvertor = require('json-schema-for-openapi')
const $RefParser = require("@apidevtools/json-schema-ref-parser");

class DefinitionGenerator {
    constructor(serverless, options = {}) {
        this.version = serverless?.processedInput?.options?.openApiVersion || '3.0.0'

        this.serverless = serverless
        this.httpKeys = {
            http: 'http',
            httpAPI: 'httpApi',
        }

        this.componentsSchemas = {
            requestBody: 'requestBodies',
            responses: 'responses',
        }

        this.openAPI = {
            openapi: this.version,
        }

        this.operationIds = []
        this.schemaIDs = []

        try {
            this.refParserOptions = require(path.resolve('options', 'ref-parser.js'))
        } catch (err) {
            this.refParserOptions = {}
        }

    }

    async parse() {
        this.createInfo()

        if (this.serverless.service.custom.documentation.securitySchemes) {
            this.createSecuritySchemes(this.serverless.service.custom.documentation.securitySchemes)

            if (this.serverless.service.custom.documentation.security) {
                this.openAPI.security = this.serverless.service.custom.documentation.security
            }
        }

        await this.createPaths()
            .catch(err => {
                throw err
            })

        if (this.serverless.service.custom.documentation.servers) {
            const servers = this.createServers(this.serverless.service.custom.documentation.servers)
            Object.assign(this.openAPI, {servers: servers})
        }

        if (this.serverless.service.custom.documentation.tags) {
            this.createTags()
        }

        if (this.serverless.service.custom.documentation.externalDocumentation) {
            const extDoc = this.createExternalDocumentation(this.serverless.service.custom.documentation.externalDocumentation)
            Object.assign(this.openAPI, {externalDocs: extDoc})
        }
    }

    createInfo() {
        const service = this.serverless.service
        const documentation = this.serverless.service.custom.documentation;

        const info = {
            title: documentation?.title || service.service,
            description: documentation?.description || '',
            version: documentation?.version || uuid(),
        }

        if (documentation.termsOfService)
            info.termsOfService = documentation.termsOfService

        if (documentation.contact) {
            const contactObj = {}
            contactObj.name = documentation.contact.name || ''

            if (documentation.contact.url)
                contactObj.url = documentation.contact.url

            contactObj.email = documentation.contact.email || ''
            Object.assign(info, {contact: contactObj})
        }

        if (documentation.license && documentation.license.name) {
            const licenseObj = {}
            licenseObj.name = documentation.license.name || ''

            if (documentation.license.url)
                licenseObj.url = documentation.license.url || ''

            Object.assign(info, {license: licenseObj})
        }

        for (const key of Object.keys(documentation)) {
            if (/^[x\-]/i.test(key)) {
                Object.assign(info, {[key]: documentation[key]})
            }
        }

        Object.assign(this.openAPI, {info})
    }

    async createPaths() {
        const paths = {}
        const httpFunctions = this.getHTTPFunctions()
        for (const httpFunction of httpFunctions) {
            for (const event of httpFunction.event) {
                if (event?.http?.documentation || event?.httpApi?.documentation) {
                    const documentation = event?.http?.documentation || event?.httpApi?.documentation

                    this.currentFunctionName = httpFunction.functionInfo.name

                    let opId
                    if (this.operationIds.includes(httpFunction.functionInfo.name) === false) {
                        opId = httpFunction.functionInfo.name
                        this.operationIds.push(opId)
                    } else {
                        opId = `${httpFunction.functionInfo.name}-${uuid()}`
                    }

                    const path = await this.createOperationObject(event?.http?.method || event?.httpApi?.method, documentation, opId)
                        .catch(err => {
                            throw err
                        })

                    if (httpFunction.functionInfo?.summary)
                        path.summary = httpFunction.functionInfo.summary

                    if (httpFunction.functionInfo?.description)
                        path.description = httpFunction.functionInfo.description

                    if (httpFunction.functionInfo?.servers) {
                        const servers = this.createServers(httpFunction.functionInfo.servers)
                        path.servers = servers
                    }

                    let slashPath = event?.http?.path || event.httpApi?.path
                    const pathStart = new RegExp(/^\//, 'g')
                    if (pathStart.test(slashPath) === false) {
                        slashPath = `/${event?.http?.path||event.httpApi?.path}`
                    }

                    if (paths[slashPath]) {
                        Object.assign(paths[slashPath], path);
                    } else {
                        Object.assign(paths, {[slashPath]: path});
                    }
                }
            }
        }
        Object.assign(this.openAPI, {paths})
    }

    createServers(servers) {
        const serverDoc = servers
        const newServers = []

        if (Array.isArray(serverDoc)) {
            for (const server of serverDoc) {
                const obj = {
                    url: server.url,
                }

                if (server.description) {
                    obj.description = server.description
                }

                if (server.variables) {
                    obj.variables = server.variables
                }

                newServers.push(obj)
            }
        } else {
            const obj = {
                url: servers.url,
            }

            if (servers.description) {
                obj.description = servers.description
            }

            if (servers.variables) {
                obj.variables = servers.variables
            }

            newServers.push(obj)
        }

        return newServers
    }

    createExternalDocumentation(docs) {
        return {...docs}
        // const documentation = this.serverless.service.custom.documentation
        // if (documentation.externalDocumentation) {
        //     // Object.assign(this.openAPI, {externalDocs: {...documentation.externalDocumentation}})
        //     return
        // }
    }

    createTags() {
        const tags = []
        for (const tag of this.serverless.service.custom.documentation.tags) {
            const obj = {
                name: tag.name,
            }

            if (tag.description) {
                obj.description = tag.description
            }

            if (tag.externalDocumentation) {
                obj.externalDocs = this.createExternalDocumentation(tag.externalDocumentation)
            }
            tags.push(obj)
        }
        Object.assign(this.openAPI, {tags: tags})
    }

    async createOperationObject(method, documentation, name = uuid()) {
        const obj = {
            summary: documentation.summary || '',
            description: documentation.description || '',
            operationId: documentation.operationId || name,
            parameters: [],
            tags: documentation.tags || []
        }

        if (documentation.pathParams) {
            const paramObject = await this.createParamObject('path', documentation)
                .catch(err => {
                    throw err
                })
            obj.parameters = obj.parameters.concat(paramObject)
        }

        if (documentation.queryParams) {
            const paramObject = await this.createParamObject('query', documentation)
                .catch(err => {
                    throw err
                })
            obj.parameters = obj.parameters.concat(paramObject)
        }

        if (documentation.headerParams) {
            const paramObject = await this.createParamObject('header', documentation)
                .catch(err => {
                    throw err
                })
            obj.parameters = obj.parameters.concat(paramObject)
        }

        if (documentation.cookieParams) {
            const paramObject = await this.createParamObject('cookie', documentation)
                .catch(err => {
                    throw err
                })
            obj.parameters = obj.parameters.concat(paramObject)
        }

        if (documentation.externalDocumentation) {
            obj.externalDocs = documentation.externalDocumentation
        }

        if (Object.keys(documentation).includes('security')) {
            obj.security = documentation.security
        }

        if (Object.keys(documentation).includes('deprecated'))
            obj.deprecated = documentation.deprecated

        if (documentation.requestBody)
            obj.requestBody = await this.createRequestBody(documentation)
                .catch(err => {
                    throw err
                })

        if (documentation.methodResponses)
            obj.responses = await this.createResponses(documentation)
                .catch(err => {
                    throw err
                })

        if (documentation.servers) {
            const servers = this.createServers(documentation.servers)
            obj.servers = servers
        }

        return {[method.toLowerCase()]: obj}
    }

    async createResponses(documentation) {
        const responses = {}
        for (const response of documentation.methodResponses) {
            const obj = {
                description: response.responseBody.description || '',
            }

            this.currentStatusCode = response.statusCode

            obj.content = await this.createMediaTypeObject(response.responseModels, 'responses')
                .catch(err => {
                    throw err
                })

            if (response.responseHeaders) {
                obj.headers = await this.createResponseHeaders(response.responseHeaders)
                    .catch(err => {
                        throw err
                    })
            }

            Object.assign(responses,{[response.statusCode]: obj})
        }

        return responses
    }

    async createResponseHeaders(headers) {
        const obj = {}
        for (const header of Object.keys(headers)) {
            const newHeader = {}
            newHeader.description = headers[header].description || ''

            if (headers[header].schema) {
                const schemaRef = await this.schemaCreator(headers[header].schema, header)
                    .catch(err => {
                        throw err
                    })
                newHeader.schema = {
                    $ref: schemaRef
                }
            }

            Object.assign(obj, {[header]: newHeader})
        }

        return obj
    }

    async createRequestBody(documentation) {
        const obj = {
            description: documentation.requestBody.description,
            required: documentation.requestBody.required || false,
        }

        obj.content = await this.createMediaTypeObject(documentation.requestModels, 'requestBody')
            .catch(err => {
                throw err
            })

        return obj
    }

    async createMediaTypeObject(models, type) {
        const mediaTypeObj = {}
        for (const mediaTypeDocumentation of this.serverless.service.custom.documentation.models) {
            if (models === undefined || models === null) {
                throw new Error(`${this.currentFunctionName} is missing a Response Model for statusCode ${this.currentStatusCode}`)
            }

            if (Object.values(models).includes(mediaTypeDocumentation.name)) {
                let contentKey = ''
                for (const [key, value] of Object.entries(models)) {
                    if (value === mediaTypeDocumentation.name)
                        contentKey = key;
                }
                const obj = {}

                if (mediaTypeDocumentation.example)
                    obj.example = mediaTypeDocumentation.example

                if (mediaTypeDocumentation.examples)
                    obj.examples = this.createExamples(mediaTypeDocumentation.examples)

                let schema
                if (mediaTypeDocumentation?.content) {
                    schema = mediaTypeDocumentation.content[contentKey].schema
                } else if (mediaTypeDocumentation?.contentType && mediaTypeDocumentation.schema) {
                    schema = mediaTypeDocumentation.schema
                }

                const schemaRef = await this.schemaCreator(schema, mediaTypeDocumentation.name)
                    .catch(err => {
                        throw err
                    })
                obj.schema = {
                    $ref: schemaRef
                }

                Object.assign(mediaTypeObj, {[contentKey]: obj})
            }
        }
        return mediaTypeObj
    }

    async createParamObject(paramIn, documentation) {
        const params = []
        for (const param of documentation[`${paramIn}Params`]) {
            const obj = {
                name: param.name,
                in: paramIn,
                description: param.description || '',
                required: (paramIn === 'path') ? true : param.required || false,
            }

            if (Object.keys(param).includes('deprecated')) {
                obj.deprecated = param.deprecated
            }

            if (paramIn === 'query' && Object.keys(param).includes('allowEmptyValue')) {
                obj.allowEmptyValue = param.allowEmptyValue
            }

            if (param.style)
                obj.style = param.style

            if (Object.keys(param).includes('explode'))
                obj.explode = param.explode

            if (paramIn === 'query' && param.allowReserved)
                obj.allowReserved = param.allowReserved

            if (param.example)
                obj.example = param.example

            if (param.examples)
                obj.examples = this.createExamples(param.examples)

            if (param.schema) {
                const schemaRef = await this.schemaCreator(param.schema, param.name)
                    .catch(err => {
                        throw err
                    })
                obj.schema = {
                    $ref: schemaRef
                }
            }

            params.push(obj)
        }
        return params;
    }

    async dereferenceSchema(schema) {
        let deReferencedSchema = await $RefParser.dereference(schema, this.refParserOptions)
            .catch(err => {
                console.error(err)
                throw err
            })

        // deal with schemas that have been de-referenced poorly: naive
        if (deReferencedSchema.$ref === '#') {
            const oldRef = schema.$ref
            const path = oldRef.split('/')

            const pathTitle = path[path.length-1]
            const property = deReferencedSchema.definitions[path[path.length-1]]
            Object.assign(deReferencedSchema, {properties: {[pathTitle]: property}})
            delete deReferencedSchema.$ref
            deReferencedSchema = await this.dereferenceSchema(deReferencedSchema)
                .catch((err) => {
                    throw err
                })
        }

        return deReferencedSchema
    }

    async schemaCreator(schema, name) {
        let deReferencedSchema = await this.dereferenceSchema(schema)
            .catch((err) => {
                throw err
            })

        const convertedSchema = SchemaConvertor.convert(deReferencedSchema, name)

        let schemaName = name
        if (this.schemaIDs.includes(schemaName))
            schemaName = `${name}-${uuid()}`

        this.schemaIDs.push(schemaName)

        for (const key of Object.keys(convertedSchema.schemas)) {
            if (key === name || key.split('-')[0] === name) {
                let ref = `#/components/schemas/`

                if (this.existsInComponents(name)) {
                    if (this.isTheSameSchema(convertedSchema.schemas[key], name)) {
                        return `${ref}${name}`
                    }
                }

                this.addToComponents('schemas', convertedSchema.schemas[key], schemaName)
                return `${ref}${schemaName}`
            } else {
                if (this.existsInComponents(key)) {
                    if (this.isTheSameSchema(convertedSchema.schemas[key], key)) {
                        this.addToComponents('schemas', convertedSchema.schemas[key], key)
                    }
                } else {
                    this.addToComponents('schemas', convertedSchema.schemas[key], key)
                }
            }
        }
    }

    existsInComponents(name) {
        return Boolean(this.openAPI?.components?.schemas?.[name])
    }

    isTheSameSchema(schema, otherSchemaName) {
        return (JSON.stringify(schema) === JSON.stringify(this.openAPI.components.schemas[otherSchemaName]))
    }

    addToComponents(type, schema, name) {
        const schemaObj = {
            [name]: schema
        }

        if (this.openAPI?.components) {
            if (this.openAPI.components[type]) {
                Object.assign(this.openAPI.components[type], schemaObj)
            } else {
                Object.assign(this.openAPI.components, {[type]: schemaObj})
            }
        } else {
            const components = {
                components: {
                    [type]: schemaObj
                }
            }

            Object.assign(this.openAPI, components)
        }
    }

    createSecuritySchemes(securitySchemes) {
        for (const scheme of Object.keys(securitySchemes)) {
            const securityScheme = securitySchemes[scheme]
            const schema = {}

            if (securityScheme.description)
                schema.description = securityScheme.description

            switch(securityScheme.type.toLowerCase()) {
                case 'apikey':
                    const apiKeyScheme = this.createAPIKeyScheme(securityScheme)
                    schema.type = 'apiKey'
                    Object.assign(schema, apiKeyScheme)
                break;

                case 'http':
                    const HTTPScheme = this.createHTTPScheme(securityScheme)
                    schema.type = 'http'
                    Object.assign(schema, HTTPScheme)
                break;

                case 'openidconnect':
                    const openIdConnectScheme = this.createOpenIDConnectScheme(securityScheme)
                    schema.type = 'openIdConnect'
                    Object.assign(schema, openIdConnectScheme)
                break;

                case 'oauth2':
                    const oAuth2Scheme = this.createOAuth2Scheme(securityScheme)
                    schema.type = 'oauth2'
                    Object.assign(schema, oAuth2Scheme)
                break;
            }

            this.addToComponents('securitySchemes', schema, scheme)
        }
    }

    createAPIKeyScheme(securitySchema) {
        const schema = {}
        if (securitySchema.name)
            schema.name = securitySchema.name
        else
            throw new Error('Security Scheme for "apiKey" requires the name of the header, query or cookie parameter to be used')

        if (securitySchema.in)
            schema.in = securitySchema.in
        else
            throw new Error('Security Scheme for "apiKey" requires the location of the API key: header, query or cookie parameter')

        return schema
    }

    createHTTPScheme(securitySchema) {
        const schema = {}

        if (securitySchema.scheme)
            schema.scheme = securitySchema.scheme
        else
            throw new Error('Security Scheme for "http" requires scheme')

        if (securitySchema.bearerFormat)
            schema.bearerFormat = securitySchema.bearerFormat

        return schema
    }

    createOpenIDConnectScheme(securitySchema) {
        const schema = {}
        if (securitySchema.openIdConnectUrl)
            schema.openIdConnectUrl = securitySchema.openIdConnectUrl
        else
            throw new Error('Security Scheme for "openIdConnect" requires openIdConnectUrl')

        return schema
    }

    createOAuth2Scheme(securitySchema) {
        const schema = {}
        if (securitySchema.flows) {
            const flows = this.createOAuthFlows(securitySchema.flows)
            Object.assign(schema, {flows: flows})
        } else
            throw new Error('Security Scheme for "oauth2" requires flows')

        return schema
    }

    createOAuthFlows(flows) {
        const obj = {}
        for (const flow of Object.keys(flows)) {
            const schema = {}
            if (["implicit", 'authorizationCode'].includes(flow))
                if (flows[flow].authorizationUrl)
                    schema.authorizationUrl = flows[flow].authorizationUrl
                else
                    throw new Error(`oAuth2 ${flow} flow requires an authorizationUrl`)

            if (['password', 'clientCredentials', 'authorizationCode'].includes(flow)) {
                if (flows[flow].tokenUrl)
                    schema.tokenUrl = flows[flow].tokenUrl
                else
                    throw new Error(`oAuth2 ${flow} flow requires a tokenUrl`)
            }

            if (flows[flow].refreshUrl)
                schema.refreshUrl = flows[flow].refreshUrl

            if (flows[flow].scopes)
                schema.scopes = flows[flow].scopes
            else
                throw new Error(`oAuth2 ${flow} flow requires scopes`)

            Object.assign(obj, {[flow]: schema})
        }
        return obj
    }

    createExamples(examples) {
        const examplesObj = {}

        for(const example of examples) {
            Object.assign(examplesObj, {[example.name]: example})
        }

        return examplesObj;
    }

    getHTTPFunctions() {
        const isHttpFunction = (funcType) => {
            const keys = Object.keys(funcType)
            if (keys.includes(this.httpKeys.http) || keys.includes(this.httpKeys.httpAPI))
                return true
        }
        const functionNames = this.serverless.service.getAllFunctions()

        return functionNames.map(functionName => {
            return this.serverless.service.getFunction(functionName)
        })
            .filter(functionType => {
                if (functionType?.events.some(isHttpFunction))
                    return functionType
            })
            .map(functionType => {
                const event = functionType.events.filter(isHttpFunction)
                return {
                    functionInfo: functionType,
                    handler: functionType.handler,
                    name: functionType.name,
                    event
                }
            })
    }

    async validate() {
        return await validator.validateInner(this.openAPI, {})
            .catch(err => {
                throw err
            })
    }
}

module.exports = DefinitionGenerator
