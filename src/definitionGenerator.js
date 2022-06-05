'use strict'

const path = require('path')

const { v4: uuid } = require('uuid')
const validator = require('oas-validator');
const SchemaConvertor = require('json-schema-for-openapi')
const $RefParser = require("@apidevtools/json-schema-ref-parser");

class DefinitionGenerator {
    constructor(serverless, options = {}) {
        this.version = serverless.processedInput.options.openApiVersion || '3.0.0'

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

        try {
            this.refParserOptions = require(path.resolve('options', 'ref-parser.js'))
        } catch (err) {
            this.refParserOptions = {}
        }
        
    }

    async parse() {
        this.createInfo()
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
        Object.assign(this.openAPI, {info})
    }

    async createPaths() {
        const paths = {}
        const httpFunctions = this.getHTTPFunctions()

        for (const httpFunction of httpFunctions) {
            for (const event of httpFunction.event) {
                if (event?.http?.documentation || event?.httpApi?.documentation) {
                    const documentation = event.http.documentation || event.httpApi.documentation

                    let opId
                    if (this.operationIds.includes(httpFunction.functionInfo.name) === false) {
                        opId = httpFunction.functionInfo.name
                        this.operationIds.push(opId)
                    } else {
                        opId = `${httpFunction.functionInfo.name}-${uuid()}`
                    }

                    const path = await this.createOperationObject(event.http.method || event.httpApi.method, documentation, opId)
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

                    let slashPath = event.http.path
                    const pathStart = new RegExp(/^\//, 'g')
                    if (pathStart.test(slashPath) === false) {
                        slashPath = `/${event.http.path}`
                    }

                    Object.assign(paths, {[slashPath]: path})
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

                newServers.push(obj)
            }
        } else {
            const obj = {
                url: servers.url,
            }

            if (servers.description) {
                obj.description = servers.description
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

        return {[method]: obj}
    }

    async createResponses(documentation) {
        const responses = {}
        for (const response of documentation.methodResponses) {
            const obj = {
                description: response.responseBody.description || '',
            }

            obj.content = await this.createMediaTypeObject(response.responseModels, 'responses')
                .catch(err => {
                    throw err
                })

            Object.assign(responses,{[response.statusCode]: obj})
        }

        return responses
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

                if (mediaTypeDocumentation.content[contentKey].schema) {
                    const schemaRef = await this.schemaCreator(mediaTypeDocumentation.content[contentKey].schema, mediaTypeDocumentation.name)
                        .catch(err => {
                            throw err
                        })
                    obj.schema = {
                        $ref: schemaRef
                    }
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

    async schemaCreator(schema, name) {
        const addToComponents = (schema, name) => {
            const schemaObj = {
                [name]: schema
            }

            if (this.openAPI?.components) {
                if (this.openAPI.components?.schemas) {
                    Object.assign(this.openAPI.components.schemas, schemaObj)
                } else {
                    Object.assign(this.openAPI.components, {schemas: schemaObj})
                }
            } else {
                const components = {
                    components: {
                        schemas: schemaObj
                    }
                }

                Object.assign(this.openAPI, components)
            }
        }

        if (typeof schema !== 'string' && Object.keys(schema).length > 0) {
            const convertedSchema = SchemaConvertor.convert(schema)
            for (const key of Object.keys(convertedSchema.schemas)) {
                if (key === 'main' || key.split('-')[0] === 'main') {
                    const ref = `#/components/schemas/${name}`

                    addToComponents(convertedSchema.schemas[key], name)
                    return ref
                } else {
                    addToComponents(convertedSchema.schemas[key], key)
                }
            }
        } else {
            const combinedSchema = await $RefParser.dereference(schema, this.refParserOptions)
                .catch(err => {
                    console.error(err)
                    throw err
                })

            return await this.schemaCreator(combinedSchema, name)
                .catch(err => {
                    throw err
                })
        }
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
