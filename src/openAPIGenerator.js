'use strict'

const { v4: uuid, validate: validateUUID } = require('uuid')
const validator = require('oas-validator');

class OpenAPIGenerator {
    constructor(serverless) {
        this.serverless = serverless

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
    }

    parse() {
        this.createPaths()
    }

    createPaths() {
        const paths = {}
        const httpFunctions = this.getHTTPFunctions()
        for (const httpFunction of httpFunctions) {
            for (const event of httpFunction.event) {
                this.isHTTPApi = (event?.httpApi) ? true : false

                this.httpEvent = event?.http || event?.httpApi

                const pathObj = this.createOpertations()
                Object.assign(paths, pathObj)
            }
        }
        Object.assign(this.openAPI, {paths})
    }

    createOpertations() {
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

        if (catchAll) {
            const operationObj = this.createOperationObject()
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
            const operationObj = this.createOperationObject()
            addOperation(operationObj)
        }

        return pathObj
    }

    createOperationObject() {
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


        if (/({[a-zA-Z0-9]+})/.test(this.path)) {
            const params = this.createPathParameters()
            this.parameters = this.parameters.concat(params)
        }

        if (this.parameters.length) {
            obj.parameters = this.parameters
        }

        return {[this.method.toLowerCase()]: obj}
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
