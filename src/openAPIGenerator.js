'use strict'

const { v4: uuid } = require('uuid')
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

        this.defaultCORSHeaders = [
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
    }

    parse() {
        this.createPaths()
    }

    createPaths() {
        const paths = {}
        const httpFunctions = this.getHTTPFunctions()
        for (const httpFunction of httpFunctions) {
            for (const event of httpFunction.event) {
                const isHTTPApi = (event?.httpApi) ? true : false
                // const httpEvent = event?.http || event?.httpApi
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
        let method
        let path

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

        method = method.toLowerCase()

        const pathStart = new RegExp(/^\//, 'g')
        let slashPath = path
        if (pathStart.test(slashPath) === false) {
            slashPath = `/${slashPath}`
        }

        if (catchAll) {
            for (const operation of this.operations) {
                const operationObj = this.createOperationObject(operation)
                if (pathObj[slashPath]) {
                    Object.assign(pathObj[slashPath], operationObj);
                } else {
                    Object.assign(pathObj, {[slashPath]: operationObj});
                }
            }
        } else {
            const operationObj = this.createOperationObject(method)
            if (pathObj[slashPath]) {
                Object.assign(pathObj[slashPath], operationObj);
            } else {
                Object.assign(pathObj, {[slashPath]: operationObj});
            }
        }

        return pathObj
    }

    createOperationObject(method) {
        const obj = {
            operationId: uuid(),
            responses: {
                default: {
                    '$ref': '#/components/responses/200'
                }
            }
        }

        if (this.httpEvent.cors) {
            if (this.httpEvent.cors === true) {
                obj.parameters = []
                this.defaultCORSHeaders.forEach(header => {
                    obj.parameters.push({
                        name: header.name,
                        in: header.in,
                        '$ref': `#/components/headers/${header.name}`
                    })

                    const refHeader = {
                        // name: header.name,
                        // required: header.required,
                        schema: header.schema,
                        // example: header.example,
                        // in: 'header'
                    }

                    if (!this.openAPI.components.headers)
                        this.openAPI.components.headers = {}

                    Object.assign(this.openAPI.components.headers, {[header.name]: refHeader})
                })
            }
        }

        return {[method.toLowerCase()]: obj}
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

module.exports = OpenAPIGenerator
