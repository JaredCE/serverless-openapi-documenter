'use strict'

const fs = require('fs').promises
const path = require('path')

const expect = require('chai').expect
const nock = require('nock')

const modelsDocumentOG = require('../models/models/models.json')
const modelsAltDocumentOG = require('../models/models/models-alt.json')
const modelsListDocumentOG = require('../models/models/modelsList.json')
const modelsListAltDocumentOG = require('../models/models/modelsList-alt.json')

const serverlessMock = require('../helpers/serverless')
const SchemaHandler = require('../../src/schemaHandler')


describe(`SchemaHandler`, function () {
    let mockServerless
    let openAPI
    let modelsDocument, modelsAltDocument, modelsListDocument, modelsListAltDocument
    const v4 = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i)
    const openAPISchema = {
        version: '3.0.3',
        components: {
            schemas: {}
        }
    }

    beforeEach(function() {
        mockServerless = JSON.parse(JSON.stringify(serverlessMock))
        modelsDocument = JSON.parse(JSON.stringify(modelsDocumentOG))
        modelsAltDocument = JSON.parse(JSON.stringify(modelsAltDocumentOG))
        modelsListDocument = JSON.parse(JSON.stringify(modelsListDocumentOG))
        modelsListAltDocument = JSON.parse(JSON.stringify(modelsListAltDocumentOG))
        openAPI = JSON.parse(JSON.stringify(openAPISchema))
    });

    describe(`constuctor`, function () {
        it('should return an instance of SchemaHandler', function() {
            const expected = new SchemaHandler(mockServerless, openAPI)
            expect(expected).to.be.an.instanceOf(SchemaHandler)
        });

        describe(`standardising the models`, function () {
            it(`should standardise models syntax in to the correct format`, function() {
                Object.assign(mockServerless.service.custom.documentation, modelsDocument)
                const expected = new SchemaHandler(mockServerless, openAPI)

                expect(expected.models).to.be.an('array')
                expect(expected.models.length).to.be.equal(1)

                expect(expected.models[0].name).to.equal('ErrorResponse')
                expect(expected.models[0]).to.have.property('contentType')
                expect(expected.models[0]).to.have.property('schema')
                expect(expected.models[0].schema).to.be.eql({type: 'object', properties: {error: {type: 'string'}}})
            });

            it(`should standardise alternative models syntax in to the correct format`, function() {
                Object.assign(mockServerless.service.custom.documentation, modelsAltDocument)
                const expected = new SchemaHandler(mockServerless, openAPI)

                expect(expected.models).to.be.an('array')
                expect(expected.models.length).to.be.equal(1)

                expect(expected.models[0].name).to.equal('ErrorResponse')
                expect(expected.models[0]).to.have.property('contentType')
                expect(expected.models[0]).to.have.property('schema')
                expect(expected.models[0].schema).to.be.eql({type: 'object', properties: {error: {type: 'string'}}})
            });

            it(`should standardise modelsList syntax in to the correct format`, function() {
                Object.assign(mockServerless.service.custom.documentation, modelsListDocument)
                const expected = new SchemaHandler(mockServerless, openAPI)

                expect(expected.models).to.be.an('array')
                expect(expected.models.length).to.be.equal(1)

                expect(expected.models[0].name).to.equal('ErrorResponse')
                expect(expected.models[0]).to.have.property('contentType')
                expect(expected.models[0]).to.have.property('schema')
                expect(expected.models[0].schema).to.be.eql({type: 'object', properties: {error: {type: 'string'}}})
            });

            it(`should standardise alternative modelsList syntax in to the correct format`, function() {
                Object.assign(mockServerless.service.custom.documentation, modelsListAltDocument)
                const expected = new SchemaHandler(mockServerless, openAPI)

                expect(expected.models).to.be.an('array')
                expect(expected.models.length).to.be.equal(1)

                expect(expected.models[0].name).to.equal('ErrorResponse')
                expect(expected.models[0]).to.have.property('contentType')
                expect(expected.models[0]).to.have.property('schema')
                expect(expected.models[0].schema).to.be.eql({type: 'object', properties: {error: {type: 'string'}}})
            });

            it(`should standardise mixed models syntax in to the correct format`, function() {
                const newModelsDocument = JSON.parse(JSON.stringify(modelsDocument))
                Object.assign(mockServerless.service.custom.documentation, newModelsDocument)
                mockServerless.service.custom.documentation.models.push(
                    {
                        name: 'SuccessResponse',
                        description: 'A success response',
                        contentType: 'application/json',
                        schema: {
                            type: 'string'
                        }
                    }
                )
                const expected = new SchemaHandler(mockServerless, openAPI)

                expect(expected.models).to.be.an('array')
                expect(expected.models.length).to.be.equal(2)

                expect(expected.models[0].name).to.equal('ErrorResponse')
                expect(expected.models[0]).to.have.property('contentType')
                expect(expected.models[0]).to.have.property('schema')
                expect(expected.models[0].schema).to.be.eql({type: 'object', properties: {error: {type: 'string'}}})

                expect(expected.models[1].name).to.equal('SuccessResponse')
                expect(expected.models[1]).to.have.property('contentType')
                expect(expected.models[1]).to.have.property('schema')
                expect(expected.models[1].schema).to.be.eql({type: 'string'})
            });

            it(`should standardise mixed modelsList syntax in to the correct format`, function() {
                const newModelsDocument = JSON.parse(JSON.stringify(modelsListDocument))
                Object.assign(mockServerless.service.custom.documentation, newModelsDocument)
                mockServerless.service.custom.documentation.modelsList.push(
                    {
                        name: 'SuccessResponse',
                        description: 'A success response',
                        contentType: 'application/json',
                        schema: {
                            type: 'string'
                        }
                    }
                )
                const expected = new SchemaHandler(mockServerless, openAPI)

                expect(expected.models).to.be.an('array')
                expect(expected.models.length).to.be.equal(2)

                expect(expected.models[0].name).to.equal('ErrorResponse')
                expect(expected.models[0]).to.have.property('contentType')
                expect(expected.models[0]).to.have.property('schema')
                expect(expected.models[0].schema).to.be.eql({type: 'object', properties: {error: {type: 'string'}}})

                expect(expected.models[1].name).to.equal('SuccessResponse')
                expect(expected.models[1]).to.have.property('contentType')
                expect(expected.models[1]).to.have.property('schema')
                expect(expected.models[1].schema).to.be.eql({type: 'string'})
            });

            it(`should standardise mixed models and modelsList syntax in to the correct format`, function() {
                const newModelsDocument = JSON.parse(JSON.stringify(modelsListDocument))
                Object.assign(mockServerless.service.custom.documentation, newModelsDocument)
                Object.assign(
                    mockServerless.service.custom.documentation,
                    {
                        models: [
                            {
                                name: 'SuccessResponse',
                                description: 'A success response',
                                contentType: 'application/json',
                                schema: {
                                    type: 'string'
                                }
                            }
                        ]
                    }
                )

                const expected = new SchemaHandler(mockServerless, openAPI)

                expect(expected.models).to.be.an('array')
                expect(expected.models.length).to.be.equal(2)

                expect(expected.models[0].name).to.equal('SuccessResponse')
                expect(expected.models[0]).to.have.property('contentType')
                expect(expected.models[0]).to.have.property('schema')
                expect(expected.models[0].schema).to.be.eql({type: 'string'})

                expect(expected.models[1].name).to.equal('ErrorResponse')
                expect(expected.models[1]).to.have.property('contentType')
                expect(expected.models[1]).to.have.property('schema')
                expect(expected.models[1].schema).to.be.eql({type: 'object', properties: {error: {type: 'string'}}})
            });
        });

        it(`should correctly resolve the RefParserOptions`, async function() {
            let expected = new SchemaHandler(mockServerless, openAPI)
            expect(expected.refParserOptions).to.be.an('object')
            expect(expected.refParserOptions).to.be.empty

            await fs.mkdir(path.resolve('options'))
                .catch(err => {
                    console.error(err)
                    throw err
                })

            await fs.copyFile(path.resolve('test/helpers/ref-parser.js'), path.resolve('options/ref-parser.js'))
                .catch(err => {
                    console.error(err)
                    throw err
                })

            expected = new SchemaHandler(mockServerless, openAPI)
            expect(expected.refParserOptions).to.be.an('object')
            expect(expected.refParserOptions).to.have.property('continueOnError')

            await fs.rm(path.resolve('options/ref-parser.js'))
                .catch(err => {
                    console.error(err)
                    throw err
                })

            await fs.rmdir(path.resolve('options'))
                .catch(err => {
                    console.error(err)
                    throw err
                })
        });
    });

    describe(`addModelsToOpenAPI`, function () {
        describe(`embedded simple schemas`, function () {
            it(`should add the model to the openAPI schema`, async function() {
                Object.assign(mockServerless.service.custom.documentation, modelsDocument)
                const schemaHandler = new SchemaHandler(mockServerless, openAPI)

                await schemaHandler.addModelsToOpenAPI()

                expect(schemaHandler.openAPI).to.have.property('components')
                expect(schemaHandler.openAPI.components).to.have.property('schemas')
                expect(schemaHandler.openAPI.components.schemas).to.have.property('ErrorResponse')
                expect(schemaHandler.openAPI.components.schemas.ErrorResponse).to.be.an('object')
                expect(schemaHandler.openAPI.components.schemas.ErrorResponse).to.be.eql({type: 'object', properties: {error: {type: 'string'}}})
            });

            it(`should add a model with references to the openAPI schema`, async function() {
                Object.assign(mockServerless.service.custom.documentation, modelsDocument)
                mockServerless.service.custom.documentation.models.push(
                    {
                        name: 'SuccessResponse',
                        contentType: 'application/json',
                        schema: {
                            type: 'object',
                            properties: {
                                name: {
                                    '$ref': '#/definitions/nameObject'
                                }
                            },
                            definitions: {
                                nameObject: {
                                    type: 'object',
                                    properties: {
                                        firstName: {
                                            type: 'string'
                                        }
                                    }
                                }
                            }
                        }
                    }
                )
                const schemaHandler = new SchemaHandler(mockServerless, openAPI)

                await schemaHandler.addModelsToOpenAPI()

                expect(schemaHandler.openAPI).to.have.property('components')
                expect(schemaHandler.openAPI.components).to.have.property('schemas')
                expect(schemaHandler.openAPI.components.schemas).to.have.property('ErrorResponse')
                expect(schemaHandler.openAPI.components.schemas.ErrorResponse).to.be.an('object')
                expect(schemaHandler.openAPI.components.schemas.ErrorResponse).to.be.eql({type: 'object', properties: {error: {type: 'string'}}})

                expect(schemaHandler.openAPI.components.schemas).to.have.property('SuccessResponse')
                expect(schemaHandler.openAPI.components.schemas.SuccessResponse).to.be.an('object')
                expect(schemaHandler.openAPI.components.schemas.SuccessResponse).to.be.eql({
                    type: 'object',
                    properties: {
                        name: {
                            type: 'object',
                            properties: {
                                firstName: {
                                    type: 'string'
                                }
                            }
                        }
                    }
                })
            });

            it(`should add a model with poorly dereferenced references to the openAPI schema`, async function() {
                Object.assign(mockServerless.service.custom.documentation, modelsDocument)
                mockServerless.service.custom.documentation.models.push(
                    {
                        name: 'SuccessResponse',
                        contentType: 'application/json',
                        schema: {
                            type: 'object',
                            '$ref': '#/definitions/nameObject',
                            definitions: {
                                nameObject: {
                                    type: 'object',
                                    properties: {
                                        firstName: {
                                            type: 'string'
                                        }
                                    }
                                }
                            }
                        }
                    }
                )
                const schemaHandler = new SchemaHandler(mockServerless, openAPI)

                await schemaHandler.addModelsToOpenAPI()

                expect(schemaHandler.openAPI).to.have.property('components')
                expect(schemaHandler.openAPI.components).to.have.property('schemas')
                expect(schemaHandler.openAPI.components.schemas).to.have.property('ErrorResponse')
                expect(schemaHandler.openAPI.components.schemas.ErrorResponse).to.be.an('object')
                expect(schemaHandler.openAPI.components.schemas.ErrorResponse).to.be.eql({type: 'object', properties: {error: {type: 'string'}}})

                expect(schemaHandler.openAPI.components.schemas).to.have.property('SuccessResponse')
                expect(schemaHandler.openAPI.components.schemas.SuccessResponse).to.be.an('object')
                expect(schemaHandler.openAPI.components.schemas.SuccessResponse).to.be.eql({
                    type: 'object',
                    properties: { firstName: { type: 'string' } }
                })
            });
        });

        describe(`schemas with references`, function () {
            describe(`file references`, function () {
                it(`should add schemas with file references to the openAPI schema`, async function() {

                });
            });

            describe(`component references`, function () {
                it(`should add schemas with component references to the openAPI schema`, async function() {
                    Object.assign(mockServerless.service.custom.documentation, modelsDocument)
                    mockServerless.service.custom.documentation.models.push(
                        {
                            name: 'SuccessResponse',
                            contentType: 'application/json',
                            schema: {
                                type: 'array',
                                items: {
                                    $ref: '#/components/schemas/Agency'
                                }
                            }
                        }
                    )
                    mockServerless.service.custom.documentation.models.push(
                        {
                            name: 'Agency',
                            contentType: 'application/json',
                            schema: {
                                type: 'string'
                            }
                        }
                    )

                    const schemaHandler = new SchemaHandler(mockServerless, openAPI)

                    await schemaHandler.addModelsToOpenAPI()

                    expect(schemaHandler.openAPI).to.have.property('components')
                    expect(schemaHandler.openAPI.components).to.have.property('schemas')
                    expect(schemaHandler.openAPI.components.schemas).to.have.property('ErrorResponse')
                    expect(schemaHandler.openAPI.components.schemas.ErrorResponse).to.be.an('object')
                    expect(schemaHandler.openAPI.components.schemas.ErrorResponse).to.be.eql({type: 'object', properties: {error: {type: 'string'}}})

                    expect(schemaHandler.openAPI.components.schemas).to.have.property('SuccessResponse')
                    expect(schemaHandler.openAPI.components.schemas.SuccessResponse).to.be.an('object')
                    expect(schemaHandler.openAPI.components.schemas.SuccessResponse).to.be.eql({
                        type: 'array',
                        items: {
                            $ref: '#/components/schemas/Agency'
                        }
                    })

                    expect(schemaHandler.openAPI.components.schemas).to.have.property('Agency')
                    expect(schemaHandler.openAPI.components.schemas.Agency).to.be.an('object')
                    expect(schemaHandler.openAPI.components.schemas.Agency).to.be.eql({
                        type: 'string',
                    })
                });
            });

            describe(`other references`, function () {
                it(`should add a model that is a webUrl to the openAPI schema`, async function() {
                    Object.assign(mockServerless.service.custom.documentation, modelsDocument)
                    mockServerless.service.custom.documentation.models.push(
                        {
                            name: 'SuccessResponse',
                            contentType: 'application/json',
                            schema: 'https://google.com/build/LicensedMember.json'
                        }
                    )

                    nock('https://google.com')
                        .get('/build/LicensedMember.json')
                        .reply(200, {
                            type: 'object',
                            properties: {
                                memberId: {
                                    type: 'string'
                                },
                                createdAt: {
                                    type: 'integer'
                                }
                            }
                        })

                    const schemaHandler = new SchemaHandler(mockServerless, openAPI)

                    await schemaHandler.addModelsToOpenAPI()

                    expect(schemaHandler.openAPI).to.have.property('components')
                    expect(schemaHandler.openAPI.components).to.have.property('schemas')
                    expect(schemaHandler.openAPI.components.schemas).to.have.property('ErrorResponse')
                    expect(schemaHandler.openAPI.components.schemas.ErrorResponse).to.be.an('object')
                    expect(schemaHandler.openAPI.components.schemas.ErrorResponse).to.be.eql({type: 'object', properties: {error: {type: 'string'}}})

                    expect(schemaHandler.openAPI.components.schemas).to.have.property('SuccessResponse')
                    expect(schemaHandler.openAPI.components.schemas.SuccessResponse).to.be.an('object')
                    expect(schemaHandler.openAPI.components.schemas.SuccessResponse).to.be.eql({
                        type: 'object',
                        properties: {
                            memberId: {
                                type: 'string'
                            },
                            createdAt: {
                                type: 'integer'
                            }
                        }
                    })
                });

                it(`should add a complex model that is a webUrl to the openAPI schema`, async function() {
                    Object.assign(mockServerless.service.custom.documentation, modelsDocument)
                    mockServerless.service.custom.documentation.models.push(
                        {
                            name: 'SuccessResponse',
                            contentType: 'application/json',
                            schema: 'https://google.com/build/LicensedMember.json'
                        }
                    )

                    nock('https://google.com')
                        .get('/build/LicensedMember.json')
                        .reply(200, {
                            "type": "object",
                            "properties": {
                                "street_address": {
                                    "type": "string"
                                },
                                "country": {
                                    "default": "United States of America",
                                    "enum": ["United States of America", "Canada"]
                                }
                            },
                            "if": {
                                "properties": { "country": { "const": "United States of America" } }
                            },
                            "then": {
                                "properties": { "postal_code": { "pattern": "[0-9]{5}(-[0-9]{4})?" } }
                            },
                            "else": {
                                "properties": { "postal_code": { "pattern": "[A-Z][0-9][A-Z] [0-9][A-Z][0-9]" } }
                            }
                        })

                    const schemaHandler = new SchemaHandler(mockServerless, openAPI)

                    await schemaHandler.addModelsToOpenAPI()

                    expect(schemaHandler.openAPI).to.have.property('components')
                    expect(schemaHandler.openAPI.components).to.have.property('schemas')
                    expect(schemaHandler.openAPI.components.schemas).to.have.property('ErrorResponse')
                    expect(schemaHandler.openAPI.components.schemas.ErrorResponse).to.be.an('object')
                    expect(schemaHandler.openAPI.components.schemas.ErrorResponse).to.be.eql({type: 'object', properties: {error: {type: 'string'}}})

                    expect(schemaHandler.openAPI.components.schemas).to.have.property('SuccessResponse')
                    expect(schemaHandler.openAPI.components.schemas.SuccessResponse).to.be.an('object')
                    expect(schemaHandler.openAPI.components.schemas.SuccessResponse.properties).to.be.eql({
                        "street_address": {
                            "type": "string"
                        },
                        "country": {
                            "default": "United States of America",
                            "enum": ["United States of America", "Canada"]
                        }
                    })
                    expect(schemaHandler.openAPI.components.schemas.SuccessResponse).to.have.property('oneOf')
                    expect(schemaHandler.openAPI.components.schemas.SuccessResponse.oneOf.length).to.be.equal(2)
                    expect(Object.keys(schemaHandler.openAPI.components.schemas).length).to.be.equal(3)
                });

                it(`should throw when a webUrl returns a 404`, async function() {
                    Object.assign(mockServerless.service.custom.documentation, modelsDocument)
                    mockServerless.service.custom.documentation.models.push(
                        {
                            name: 'SuccessResponse',
                            contentType: 'application/json',
                            schema: 'https://google.com/build/LicensedMember.json'
                        }
                    )

                    nock('https://google.com')
                        .get('/build/LicensedMember.json')
                        .reply(404, {body: 'Bad Request'})

                    const schemaHandler = new SchemaHandler(mockServerless, openAPI)

                    await schemaHandler.addModelsToOpenAPI()
                        .catch(err => {
                            expect(err).to.not.be.undefined
                        })
                });
            });
        });
    });

    describe(`createSchema`, function () {
        it(`returns a reference to the schema when the schema already exists in components and we don't pass through a schema`, async function() {
            Object.assign(mockServerless.service.custom.documentation, modelsDocument)
            const schemaHandler = new SchemaHandler(mockServerless, openAPI)

            await schemaHandler.addModelsToOpenAPI()

            const expected = await schemaHandler.createSchema('ErrorResponse')

            expect(expected).to.be.equal('#/components/schemas/ErrorResponse')
        });

        it(`throws an error when the name of the schema does not exist in components and we don't pass through a schema`, async function() {
            Object.assign(mockServerless.service.custom.documentation, modelsDocument)
            const schemaHandler = new SchemaHandler(mockServerless, openAPI)

            await schemaHandler.addModelsToOpenAPI()

            const expected = await schemaHandler.createSchema('PUTRequest')
                .catch(err => {
                    expect(err).to.not.be.undefined
                    expect(err.message).to.be.equal('Expected a file path, URL, or object. Got undefined')
                })

            expect(expected).to.be.undefined
        });

        it(`returns a reference to a schema when the schema does not exist in components already`, async function() {
            Object.assign(mockServerless.service.custom.documentation, modelsDocument)
            const schemaHandler = new SchemaHandler(mockServerless, openAPI)

            await schemaHandler.addModelsToOpenAPI()
            const schema = {
                type: 'object',
                properties: {
                    createdAt: {
                        type: 'number'
                    }
                }
            }
            const expected = await schemaHandler.createSchema('PUTRequest', schema)
                .catch(err => {
                    expect(err).to.be.undefined
                })

            expect(expected).to.be.equal('#/components/schemas/PUTRequest')
            expect(schemaHandler.openAPI.components.schemas.PUTRequest).to.be.eql(schema)
        });

        it(`returns a reference to a schema when the schema exists in components already and the same schema is being passed through`, async function() {
            Object.assign(mockServerless.service.custom.documentation, modelsDocument)
            const schemaHandler = new SchemaHandler(mockServerless, openAPI)

            await schemaHandler.addModelsToOpenAPI()
            const schema = {
                type: 'object',
                properties: {
                    createdAt: {
                        type: 'number'
                    }
                }
            }
            let expected = await schemaHandler.createSchema('PUTRequest', schema)
                .catch(err => {
                    expect(err).to.be.undefined
                })

            expect(expected).to.be.equal('#/components/schemas/PUTRequest')
            expect(schemaHandler.openAPI.components.schemas.PUTRequest).to.be.eql(schema)

            expected = await schemaHandler.createSchema('PUTRequest', schema)
                .catch(err => {
                    expect(err).to.be.undefined
                })

            expect(expected).to.be.equal('#/components/schemas/PUTRequest')
            expect(schemaHandler.openAPI.components.schemas.PUTRequest).to.be.eql(schema)
        });

        it(`returns a reference to a new schema when the schema exists in components already and a different schema is being passed through`, async function() {
            Object.assign(mockServerless.service.custom.documentation, modelsDocument)
            const schemaHandler = new SchemaHandler(mockServerless, openAPI)

            await schemaHandler.addModelsToOpenAPI()
            const schema = {
                type: 'object',
                properties: {
                    createdAt: {
                        type: 'number'
                    }
                }
            }
            let expected = await schemaHandler.createSchema('PUTRequest', schema)
                .catch(err => {
                    expect(err).to.be.undefined
                })

            expect(expected).to.be.equal('#/components/schemas/PUTRequest')
            expect(schemaHandler.openAPI.components.schemas.PUTRequest).to.be.eql(schema)

            const differentSchema = {
                type: 'object',
                properties: {
                    updatedAt: {
                        type: 'number'
                    }
                }
            }

            expected = await schemaHandler.createSchema('PUTRequest', differentSchema)
                .catch(err => {
                    expect(err).to.be.undefined
                })

            const splitPath = expected.split('/')
            expect(v4.test(splitPath[3].split('PUTRequest-')[1])).to.be.true
            expect(expected).to.be.equal(`#/components/schemas/${splitPath[3]}`)
            expect(schemaHandler.openAPI.components.schemas[splitPath[3]]).to.be.eql(differentSchema)
        });

        it(`returns a reference to a new schema when the schema passed through is a URL`, async function() {
            Object.assign(mockServerless.service.custom.documentation, modelsDocument)
            const schemaHandler = new SchemaHandler(mockServerless, openAPI)

            await schemaHandler.addModelsToOpenAPI()
            const schema = 'https://google.com/build/LicensedMember.json'
            const schemaObj = {
                type: 'object',
                properties: {
                    name: {
                        type: 'string'
                    },
                    address: {
                        type: 'string'
                    }
                }
            }

            nock('https://google.com')
                .get('/build/LicensedMember.json')
                .reply(200, schemaObj)

            let expected = await schemaHandler.createSchema('PUTRequest', schema)
                .catch(err => {
                    expect(err).to.be.undefined
                })

            expect(expected).to.be.equal('#/components/schemas/PUTRequest')
            expect(schemaHandler.openAPI.components.schemas.PUTRequest).to.be.eql(schemaObj)
        });

        it(`should throw an error when a schema as a URL can not be resolved correctly`, async function() {
            Object.assign(mockServerless.service.custom.documentation, modelsDocument)
            const schemaHandler = new SchemaHandler(mockServerless, openAPI)

            await schemaHandler.addModelsToOpenAPI()
            const schema = 'https://google.com/build/LicensedMember.json'

            nock('https://google.com')
                .get('/build/LicensedMember.json')
                .reply(404)

            let expected = await schemaHandler.createSchema('PUTRequest', schema)
                .catch(err => {
                    expect(err).to.not.undefined
                })

            expect(expected).to.be.undefined
        });
    });
});
