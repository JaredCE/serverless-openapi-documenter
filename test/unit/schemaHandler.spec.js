'use strict'

const nock = require('nock')
const sinon = require('sinon')
const expect = require('chai').expect

const fs = require('fs').promises
const path = require('path')

// const serverlessMock = require('../helpers/serverless')
const SchemaHandler = require('../../src/schemaHandler')

describe(`schemaHandler`, function () {
    // let mockServerless
    // beforeEach(function() {
    //     mockServerless = JSON.parse(JSON.stringify(serverlessMock))
    // });
    const documentation = {
        version: 1,
        title: 'My API',
        description: 'This is my API',
        servers: {
            url: 'https://google.com/',
            description: 'The Server',
        },
        models: [
            {
                name: 'ErrorResponse',
                description: 'An Error Response',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                error: {
                                    type: 'string'
                                }
                            }
                        }
                    }
                }
            }
        ]
    }

    describe(`constructor`, function () {
        it(`should standardise models`, function () {
            const schmeaHandler = new SchemaHandler(documentation, '3.0.3')

            const expected = [
                {
                    name: 'ErrorResponse',
                    description: 'An Error Response',
                    contentType: 'application/json',
                    schema: {
                        type: 'object',
                        properties: {
                            error: {
                                type: 'string'
                            }
                        }
                    }
                }
            ]

            expect(schmeaHandler.models).to.be.eql(expected)
        });

        it(`should merge models and modelsList into a standard format`, function () {
            const newDocumentation = JSON.parse(JSON.stringify(documentation))
            newDocumentation.models.push({
                name: 'SuccessResponse',
                description: 'A Success Response',
                contentType: 'application/json',
                schema: {
                    type: 'object',
                    properties: {
                        response: {
                            type: 'string'
                        }
                    }
                }
            })
            newDocumentation.modelsList = [
                {
                    name: 'PutRequest',
                    description: 'A PUT Request model',
                    contentType: 'application/json',
                    schema: {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string'
                            }
                        }
                    }
                }
            ]

            const expected = [
                ...newDocumentation.modelsList,
                {
                    name: 'ErrorResponse',
                    description: 'An Error Response',
                    contentType: 'application/json',
                    schema: {
                        type: 'object',
                        properties: {
                            error: {
                                type: 'string'
                            }
                        }
                    }
                },
                {
                    name: 'SuccessResponse',
                    description: 'A Success Response',
                    contentType: 'application/json',
                    schema: {
                        type: 'object',
                        properties: {
                            response: {
                                type: 'string'
                            }
                        }
                    }
                }
            ]

            const schmeaHandler = new SchemaHandler(newDocumentation, '3.0.3')

            expect(schmeaHandler.models).to.be.eql(expected)
        });

        it(`should handle only modelsList being defined`, function() {
            const newDocumentation = JSON.parse(JSON.stringify(documentation))
            delete newDocumentation.models
            newDocumentation.modelsList = [
                {
                    name: 'PutRequest',
                    description: 'A PUT Request model',
                    contentType: 'application/json',
                    schema: {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string'
                            }
                        }
                    }
                }
            ]

            const expected = [
                ...newDocumentation.modelsList,
            ]

            const schmeaHandler = new SchemaHandler(newDocumentation, '3.0.3')

            expect(schmeaHandler.models).to.be.eql(expected)
        });

        xit('should correctly resolve the RefParserOptions', async function() {
            let expected = new SchemaHandler(documentation, '3.0.3')
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

            expected = new SchemaHandler(documentation, '3.0.3')
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

    describe(`handleSchemas`, function () {
        describe(`simple schemas`, function () {
            it(`should handle simple schemas`, async function() {
                const newDocumentation = JSON.parse(JSON.stringify(documentation))

                const schmeaHandler = new SchemaHandler(newDocumentation, '3.0.3')
                await schmeaHandler.handleSchemas()

                expect(schmeaHandler.openAPI.components.schemas).to.have.property('ErrorResponse')
                expect(schmeaHandler.openAPI.components.schemas.ErrorResponse.type).to.be.equal('object')
                expect(schmeaHandler.openAPI.components.schemas.ErrorResponse.properties.error).to.be.an('object')
            });

            it(`should resolve and de-reference schemas pointing to itself`, async function() {
                const newDocumentation = JSON.parse(JSON.stringify(documentation))
                newDocumentation.models.push(
                    {
                        name: 'PUTRequest',
                        contentType: 'application/json',
                        schema: {
                            type: 'object',
                            properties: {
                                name: {
                                    $ref: '#/components/schemas/PersonName'
                                }
                            }
                        }
                    },
                )
                newDocumentation.models.push(
                    {
                        name: 'PersonName',
                        contentType: 'application/json',
                        schema: {
                            type: 'object',
                            properties: {
                                firstName: {
                                    type: 'string'
                                },
                                lastName: {
                                    type: 'string'
                                },
                                title: {
                                    type: 'string',
                                    enum: ['Mr', 'Mrs', 'Miss'],
                                }
                            }
                        }
                    }
                )

                const schmeaHandler = new SchemaHandler(newDocumentation, '3.0.3')
                await schmeaHandler.handleSchemas()

                expect(schmeaHandler.openAPI.components.schemas).to.have.property('ErrorResponse')
                expect(schmeaHandler.openAPI.components.schemas.ErrorResponse.type).to.be.equal('object')
                expect(schmeaHandler.openAPI.components.schemas.ErrorResponse.properties.error).to.be.an('object')

                expect(schmeaHandler.openAPI.components.schemas).to.have.property('PUTRequest')
                expect(schmeaHandler.openAPI.components.schemas.PUTRequest.type).to.be.equal('object')
                expect(schmeaHandler.openAPI.components.schemas.PUTRequest.properties.name).to.be.an('object')
                expect(schmeaHandler.openAPI.components.schemas.PUTRequest.properties.name.properties).to.be.an('object')
                expect(schmeaHandler.openAPI.components.schemas.PUTRequest.properties.name.properties.firstName).to.be.an('object')

                expect(schmeaHandler.openAPI.components.schemas).to.have.property('PersonName')
                expect(schmeaHandler.openAPI.components.schemas.PersonName.type).to.be.equal('object')
            });

            it(`should handle a schema that is poorly referenced`, async function() {
                const newDocumentation = JSON.parse(JSON.stringify(documentation))
                newDocumentation.models.push(
                    {
                        name: 'PUTResponse',
                        contentType: 'application/json',
                        schema: {
                            $ref: '#/definitions/Person',
                            definitions: {
                                Person: {
                                    type: 'object',
                                    properties: {
                                        name: {
                                            type: 'string'
                                        }
                                    }
                                }
                            }
                        }
                    },
                )

                const schmeaHandler = new SchemaHandler(newDocumentation, '3.0.3')
                await schmeaHandler.handleSchemas()
                    .catch(err => {
                        console.error(err)
                    })

                expect(schmeaHandler.openAPI.components.schemas).to.have.property('ErrorResponse')
                expect(schmeaHandler.openAPI.components.schemas.ErrorResponse.type).to.be.equal('object')
                expect(schmeaHandler.openAPI.components.schemas.ErrorResponse.properties.error).to.be.an('object')

                expect(schmeaHandler.openAPI.components.schemas).to.have.property('PUTResponse')
                expect(schmeaHandler.openAPI.components.schemas.PUTResponse.type).to.be.equal('object')
                expect(schmeaHandler.openAPI.components.schemas.PUTResponse.properties.name).to.be.an('object')
                expect(schmeaHandler.openAPI.components.schemas.PUTResponse).to.not.have.property('definitions')

            });

            it(`should handle a schema that ends up being more than one schema due to conversion`, async function() {
                const newDocumentation = JSON.parse(JSON.stringify(documentation))
                newDocumentation.models.push(
                    {
                        name: 'PUTResponse',
                        contentType: 'application/json',
                        schema:{
                            "$schema": "http://json-schema.org/draft-04/schema#",
                            "title": "JSON API Schema",
                            "description": "This is a blah blah for responses in the JSON API format. For more, see http://jsonapi.org",
                            "type": "object",
                            "properties": {
                                "street_address": {
                                    "type": "string"
                                },
                                "country": {
                                    "type": "string",
                                    "default": "United States of America",
                                    "enum": [
                                        "United States of America",
                                        "Canada"
                                    ]
                                }
                            },
                            "if": {
                                "properties": {
                                    "country": {
                                        "const": "United States of America"
                                    }
                                }
                            },
                            "then": {
                                "properties": {
                                    "postal_code": {
                                        "pattern": "[0-9]{5}(-[0-9]{4})?"
                                    }
                                }
                            }
                        },
                    },
                )

                const schmeaHandler = new SchemaHandler(newDocumentation, '3.0.3')
                await schmeaHandler.handleSchemas()
                    .catch(err => {
                        console.error(err)
                    })

                expect(schmeaHandler.openAPI.components.schemas).to.have.property('ErrorResponse')
                expect(schmeaHandler.openAPI.components.schemas.ErrorResponse.type).to.be.equal('object')
                expect(schmeaHandler.openAPI.components.schemas.ErrorResponse.properties.error).to.be.an('object')

                expect(schmeaHandler.openAPI.components.schemas).to.have.property('PUTResponse')
                expect(schmeaHandler.openAPI.components.schemas.PUTResponse.properties).to.have.property('street_address')
                expect(schmeaHandler.openAPI.components.schemas.PUTResponse.properties).to.have.property('country')
                for (const anyOfSchema of schmeaHandler.openAPI.components.schemas.PUTResponse.oneOf) {
                    expect(anyOfSchema).to.have.property('allOf')
                    for (const allOfSchema of schmeaHandler.openAPI.components.schemas.PUTResponse.oneOf[0].allOf) {
                        if (allOfSchema.$ref) {
                            const refStr = allOfSchema.$ref.split('/');
                            expect(schmeaHandler.openAPI.components.schemas).to.have.property(refStr.at(-1))
                        }
                    }
                }

            });
        });

        describe(`complex schemas`, function () {
            it(`should handle schemas that are URLs`, async function() {
                const newDocumentation = JSON.parse(JSON.stringify(documentation))
                newDocumentation.models.push(
                    {
                        name: 'PUTRequest',
                        contentType: 'application/json',
                        schema: 'https://google.com/build/LicensedMember.json'
                    },
                )

                const LicensedMemberJSON = require('../json/complex.json')

                nock('https://google.com')
                    .get('/build/LicensedMember.json')
                    .reply(200, LicensedMemberJSON)

                const schmeaHandler = new SchemaHandler(newDocumentation, '3.0.3')
                await schmeaHandler.handleSchemas()

                expect(schmeaHandler.openAPI.components.schemas).to.have.property('ErrorResponse')
                expect(schmeaHandler.openAPI.components.schemas.ErrorResponse.type).to.be.equal('object')
                expect(schmeaHandler.openAPI.components.schemas.ErrorResponse.properties.error).to.be.an('object')

                expect(schmeaHandler.openAPI.components.schemas).to.have.property('PUTRequest')
                expect(schmeaHandler.openAPI.components.schemas.ErrorResponse.properties).to.have.property('log')
                expect(schmeaHandler.openAPI.components.schemas.ErrorResponse.properties).to.have.property('template')
                expect(schmeaHandler.openAPI.components.schemas.ErrorResponse.properties).to.have.property('database')
            });
        });
    });
});
