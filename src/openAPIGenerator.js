'use strict'

const { v4: uuid, validate: validateUUID } = require('uuid')
const validator = require('oas-validator');
const SchemaConvertor = require('json-schema-for-openapi')
const $RefParser = require("@apidevtools/json-schema-ref-parser");

class OpenAPIGenerator {
    constructor(serverless) {
        this.serverless = serverless

        try {
            this.refParserOptions = require(path.resolve('options', 'ref-parser.js'))
        } catch (err) {
            this.refParserOptions = {}
        }

        this.openAPI = {
            openapi: this.serverless?.processedInput?.options?.openApiVersion || '3.0.0',
            info: {
                title: this.serverless.service.service,
                version: uuid(),
            },
        }

        this.httpKeys = {
            http: 'http',
            httpAPI: 'httpApi',
        }
        this.operations = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']

        this.openAPI.components = {
            responses: {
                '200': {
                    description: 'default response',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                            },
                        },
                    },
                }
            }
        }

        this.defaultHTTPApiCORSHeaders = [
            {
                in: 'header',
                name: 'Access-Control-Allow-Origin',
                required: true,
                schema: {
                    type: 'string'
                },
                example: '*',
            },
            {
                in: 'header',
                name: 'Access-Control-Allow-Headers',
                required: true,
                schema: {
                    type: 'string'
                },
                example: 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, X-Amz-User-Agent, X-Amzn-Trace-Id',
            },
            {
                in: 'header',
                name: 'Access-Control-Allow-Methods',
                required: true,
                schema: {
                    type: 'string'
                },
                example: 'OPTIONS'
            }
        ]

        this.defaultRESTApiCORSHeaders = [
            ...this.defaultHTTPApiCORSHeaders,
            {
                in: 'header',
                name: 'Access-Control-Allow-Credentials',
                required: true,
                schema: {
                    type: 'boolean'
                },
                example: 'false'
            },
        ]

        this.modelNames = []
        this.models = {}
    }

    async parse() {
        await this.createRequestModels()
            .catch(err => {
                throw err
            })
        await this.createPaths()
            .catch(err => {
                throw err
            })
    }

    async createRequestModels() {
        if (this.serverless.service.provider?.apiGateway?.request?.schemas) {
            const schemas = this.serverless.service.provider.apiGateway.request.schemas
            for (const modelName of Object.keys(schemas)) {
                this.modelNames.push(modelName)

                const obj = {}

                if (schemas[modelName].description)
                    obj.description = schemas[modelName].description

                const newSchema = await this.schemaHandler(schemas[modelName].schema)
                    .catch(err => {
                        throw err
                    })

                obj.schema = newSchema.schemas.main

                Object.assign(this.models, {[modelName]: obj})
            }
        }
    }

    async schemaHandler(schema) {
        const deReferencedSchema = await $RefParser.dereference(schema, this.refParserOptions)
            .catch(err => {
                console.error(err)
                throw err
            })


        const convertedSchema = SchemaConvertor.convert(deReferencedSchema)

        return convertedSchema
    }

    async createPaths() {
        const paths = {}
        const httpFunctions = this.getHTTPFunctions()
        for (const httpFunction of httpFunctions) {
            for (const event of httpFunction.event) {
                this.isHTTPApi = (event?.httpApi) ? true : false

                this.httpEvent = event?.http || event?.httpApi

                const pathObj = await this.createOpertations()
                Object.assign(paths, pathObj)
            }
        }
        Object.assign(this.openAPI, {paths})
    }

    async createOpertations() {
        const pathObj = {}
        let catchAll = false
        let method, path

        if (this.httpEvent.method) {
            catchAll = (this.httpEvent.method === '*')
            method = this.httpEvent.method
            path = this.httpEvent.path
        } else {
            try {
                [method, path] = this.httpEvent.path.split(' ')
            } catch {
                catchAll = true
                method = '*'
                path = '/'
            }

        }

        this.path = path
        method = method.toLowerCase()
        this.method = method

        const pathStart = new RegExp(/^\//, 'g')
        let slashPath = path
        if (pathStart.test(slashPath) === false) {
            slashPath = `/${slashPath}`
        }

        const addOperation = (operationObj) => {
            if (pathObj[slashPath]) {
                Object.assign(pathObj[slashPath], operationObj);
            } else {
                Object.assign(pathObj, {[slashPath]: operationObj});
            }
        }

        const operationObj = await this.createOperationObject()

        if (catchAll) {
            Object.freeze(operationObj)
            for (const operation of this.operations) {
                const newOperationObj = {
                    [operation]: JSON.parse(JSON.stringify(operationObj['*']))
                }

                if (validateUUID(newOperationObj[operation].operationId)) {
                    newOperationObj[operation].operationId = uuid()
                } else {
                    newOperationObj[operation].operationId = `${newOperationObj[operation].operationId}-${uuid()}`
                }

                addOperation(newOperationObj)
            }
        } else {
            addOperation(operationObj)
        }

        return pathObj
    }

    async createOperationObject() {
        const obj = {
            operationId: this.httpEvent?.operationId || uuid(),
            responses: {
                default: {
                    '$ref': '#/components/responses/200'
                }
            }
        }

        this.parameters = []

        if (this.httpEvent.cors) {
            const corsParams = this.createCORS()
            this.parameters = this.parameters.concat(corsParams)
        }

        if (this.httpEvent?.request?.parameters) {
            const params = this.createParameters()
            this.parameters = this.parameters.concat(params)
        }

        if (this.httpEvent?.request?.schemas) {
            const requestModels = await this.createRequest()
            obj.requestBody = requestModels
        }


        if (/({[a-zA-Z0-9]+})/.test(this.path)) {
            const params = this.createPathParameters()
            this.parameters = this.parameters.concat(params)
        }

        if (this.parameters.length) {
            obj.parameters = this.parameters
        }

        return {[this.method.toLowerCase()]: obj}
    }

    async createRequest() {
        const requestObj = {}
        for (const schemaType of Object.keys(this.httpEvent.request.schemas)) {
            console.log(schemaType)

            if (typeof this.httpEvent.request.schemas[schemaType] !== 'string') {

            } else {
                if (this.modelNames.includes(this.httpEvent.request.schemas[schemaType])) {
                    const obj = {}
                    obj.content = {
                        [schemaType]: this.models[this.httpEvent.request.schemas[schemaType]]
                    }

                    if (obj.content[schemaType].description) {
                        obj.description = obj.content[schemaType].description
                        delete obj.content[schemaType].description
                    }

                    if (this.openAPI.components.requestBodies) {
                        Object.assign(this.openAPI.components.requestBodies, {[this.httpEvent.request.schemas[schemaType]]: obj})
                    } else {
                        Object.assign(this.openAPI.components, {requestBodies: {[this.httpEvent.request.schemas[schemaType]]: obj}})
                    }

                    requestObj[this.httpEvent.request.schemas[schemaType]] = {'$ref': `#/components/requestBodies/${this.httpEvent.request.schemas[schemaType]}`}
                } else {

                }
            }
        }
        return requestObj
    }

    createParameters() {
        const params = []
        const addParam = (paramType) => {
            for (const param of Object.keys(this.httpEvent.request.parameters[paramType])) {
                let inParam
                switch (paramType) {
                    case 'paths':
                        inParam = 'path'
                        break
                    case 'headers':
                        inParam = 'header'
                        break
                    case 'querystrings':
                        inParam = 'query'
                        break
                }
                const obj = {}
                obj.required = this.httpEvent.request.parameters[paramType][param]
                obj.name = param
                obj.in = inParam
                obj.schema = {}
                params.push(obj)
            }
        }
        if (this.httpEvent.request.parameters?.paths) {
            addParam('paths')
        }

        if (this.httpEvent.request.parameters?.headers) {
            addParam('headers')
        }

        if (this.httpEvent.request.parameters?.querystrings) {
            addParam('querystrings')
        }

        return params
    }

    createPathParameters() {
        const paramRegExp = /({[a-zA-Z0-9]+})/gi
        let arr
        const params = []
        while ((arr = paramRegExp.exec(this.path)) !== null) {
            let name = arr[0].replace(/{/g, '')
            name = name.replace(/}/g, '')
            let found = false
            for (const param of this.parameters) {
                if (param.in === 'path' && param.name === name)
                    found = true
            }

            if (found === false) {
                const obj = {
                    in: 'path',
                    name: name,
                    required: true,
                    schema: {}
                }

                params.push(obj)
            }
        }

        return params
    }

    createCORS() {
        if (this.httpEvent.cors === true) {
            const headerCreator = (header) => {
                const refHeader = {
                    name: header.name,
                    required: header.required,
                    schema: header.schema,
                    example: header.example,
                    in: header.in,
                }

                if (!this.openAPI.components.parameters)
                    this.openAPI.components.parameters = {}

                if (!this.openAPI.components.parameters[header.name])
                    Object.assign(this.openAPI.components.parameters, {[header.name]: refHeader})

                return {'$ref': `#/components/parameters/${header.name}`}
            }

            return (this.isHTTPApi) ? this.defaultCORSHeaders.map(headerCreator) : this.defaultRESTApiCORSHeaders.map(headerCreator)
        }
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
        return await validator.validate(this.openAPI, {})
            .catch(err => {
                throw err
            })
    }
}

module.exports = OpenAPIGenerator
