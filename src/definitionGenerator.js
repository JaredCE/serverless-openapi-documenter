'use strict'

const { v4: uuid } = require('uuid')
const validator = require('oas-validator');
const SchemaConvertor = require('json-schema-for-openapi')

class DefinitionGenerator {
    constructor(serverless, options = {}) {
        this.version = options.v || '3.0.0'

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
    }

    parse() {
        this.createInfo()
        this.createPaths()
    }

    createInfo() {
        const service = this.serverless.service
        const documentation = this.serverless.service.custom.documentation;

        const info = {
            title: service.service,
            description: documentation?.description || '',
            version: documentation?.version || uuid(),
        }
        Object.assign(this.openAPI, {info})
    }

    createPaths() {
        const paths = {}
        const httpFunctions = this.getHTTPFunctions()

        for (const httpFunction of httpFunctions) {
            for (const event of httpFunction.event) {
                if (event?.http?.documentation || event?.httpApi?.documentation) {
                    const documentation = event.http.documentation || event.httpApi.documentation

                    const path = this.createOperationObject(event.http.method || event.httpApi.method, documentation, httpFunction.functionInfo.name)
                    if (httpFunction.functionInfo?.summary)
                        path.summary = httpFunction.functionInfo.summary

                    if (httpFunction.functionInfo?.description)
                        path.description = httpFunction.functionInfo.description

                    Object.assign(paths, {[`/${event.http.path}`]: path})
                }
            }
        }
        Object.assign(this.openAPI, {paths})
    }

    createOperationObject(method, documentation, name = uuid()) {
        const obj = {
            summary: documentation.summary || '',
            description: documentation.description || '',
            operationId: documentation.operationId || name,
            parameters: [],
            tags: documentation.tags || []
        }

        if (documentation.pathParams) {
            const paramObject = this.createParamObject('path', documentation)
            obj.parameters = obj.parameters.concat(paramObject)
        }

        if (documentation.queryParams) {
            const paramObject = this.createParamObject('query', documentation)
            obj.parameters = obj.parameters.concat(paramObject)
        }

        if (documentation.headerParams) {
            const paramObject = this.createParamObject('header', documentation)
            obj.parameters = obj.parameters.concat(paramObject)
        }

        if (documentation.cookieParams) {
            const paramObject = this.createParamObject('cookie', documentation)
            obj.parameters = obj.parameters.concat(paramObject)
        }

        if (Object.keys(documentation).includes('deprecated'))
            obj[method].deprecated = documentation.deprecated

        if (documentation.requestBody)
            obj.requestBody = this.createRequestBody(documentation)

        if (documentation.methodResponses)
            obj.responses = this.createResponses(documentation)

        return {[method]: obj}
    }

    createResponses(documentation) {
        const responses = {}
        for (const response of documentation.methodResponses) {
            const obj = {
                description: response.responseBody.description || '',
            }

            obj.content = this.createMediaTypeObject(response.responseModels, 'responses')

            Object.assign(responses,{[response.statusCode]: obj})
        }

        return responses
    }

    createRequestBody(documentation) {
        const obj = {
            description: documentation.requestBody.description,
            required: documentation.requestBody.required || false,
        }

        obj.content = this.createMediaTypeObject(documentation.requestModels, 'requestBody')

        return obj
    }

    createMediaTypeObject(models, type) {
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
                    const schema = SchemaConvertor.convert(mediaTypeDocumentation.content[contentKey].schema)
                    for (const key of Object.keys(schema.schemas)) {
                        if (key === 'main' || key.split('-')[0] === 'main') {
                            obj.schema = {
                                $ref: `#/components/schemas/${mediaTypeDocumentation.name}`
                            }

                            if (this.openAPI?.components) {
                                if (this.openAPI.components?.schemas) {
                                    const schemaObj = {
                                        [mediaTypeDocumentation.name]: schema.schemas[key]
                                    }
                                    Object.assign(this.openAPI.components.schemas, schemaObj)
                                } else {
                                    const schemaObj = {
                                        [mediaTypeDocumentation.name]: schema.schemas[key]
                                    }
                                    Object.assign(this.openAPI.components, {schemas: schemaObj})
                                }
                            } else {
                                const components = {
                                    components: {
                                        schemas: {
                                            [mediaTypeDocumentation.name]: schema.schemas[key]
                                        }
                                    }
                                }
                                Object.assign(this.openAPI, components)
                            }
                        } else {
                            if (this.openAPI?.components) {
                                if (this.openAPI.components?.schemas) {
                                    const schemaObj = {
                                        [key]: schema.schemas[key]
                                    }
                                    Object.assign(this.openAPI.components.schemas, schemaObj)
                                } else {
                                    const schemaObj = {
                                        [key]: schema.schemas[key]
                                    }
                                    Object.assign(this.openAPI.components, {schemas: schemaObj})
                                }
                            } else {
                                const components = {
                                    components: {
                                        schemas: {
                                            [key]: schema.schemas[key]
                                        }
                                    }
                                }
                                Object.assign(this.openAPI, components)
                            }
                        }
                    }
                }

                Object.assign(mediaTypeObj, {[contentKey]: obj})
            }
        }
        return mediaTypeObj
    }

    createParamObject(paramIn, documentation) {
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

            if (param.explode)
                obj.explode = param.explode

            if (paramIn === 'query' && param.allowReserved)
                obj.allowReserved = param.allowReserved

            if (param.example)
                obj.example = param.example

            if (param.examples)
                obj.examples = this.createExamples(param.examples)

            if (param.schema) {
                const schema = SchemaConvertor.convert(param.schema)
                if (schema.schemas.main) {
                    Object.assign(obj,{schema: schema.schemas.main})

                }
            }

            params.push(obj)
        }
        return params;
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