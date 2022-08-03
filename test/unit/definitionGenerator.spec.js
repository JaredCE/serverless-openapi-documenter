'use strict'

const fs = require('fs').promises
const path = require('path')
const sinon = require('sinon')
const $RefParser = require("@apidevtools/json-schema-ref-parser");
const expect = require('chai').expect

const serverlessMock = require('../helpers/serverless')
const DefinitionGenerator = require('../../src/definitionGenerator')

describe('DefinitionGenerator', () => {
    let mockServerless
    const v4 = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);
    beforeEach(function() {
        mockServerless = JSON.parse(JSON.stringify(serverlessMock))
    });

    describe('constructor', () => {
        it('should return a definitionGenerator', function() {
            const expected = new DefinitionGenerator({}, {})
            expect(expected).to.be.an.instanceOf(DefinitionGenerator)
        });

        it('should default to version 3.0.0 of openAPI when openAPI version is not passed in', function() {
            let expected = new DefinitionGenerator({}, {})
            expect(expected.version).to.be.equal('3.0.0')

            let serverlessObj = {
                processedInput: {}
            }
            expected = new DefinitionGenerator(serverlessObj, {})
            expect(expected.version).to.be.equal('3.0.0')

            serverlessObj.processedInput = {
                options: {}
            }
            expected = new DefinitionGenerator(serverlessObj, {})
            expect(expected.version).to.be.equal('3.0.0')

            serverlessObj.processedInput.options = {
                test: 'abc'
            }

            expected = new DefinitionGenerator(serverlessObj, {})
            expect(expected.version).to.be.equal('3.0.0')

            serverlessObj.processedInput.options = {
                openApiVersion: null
            }

            expected = new DefinitionGenerator(serverlessObj, {})
            expect(expected.version).to.be.equal('3.0.0')

            serverlessObj.processedInput.options = {
                openApiVersion: undefined
            }

            expected = new DefinitionGenerator(serverlessObj, {})
            expect(expected.version).to.be.equal('3.0.0')

            serverlessObj.processedInput.options = {
                openapiVersion: undefined
            }

            expected = new DefinitionGenerator(serverlessObj, {})
            expect(expected.version).to.be.equal('3.0.0')
        });

        it('should respect the version of openAPI when passed in', function() {
            let serverlessObj = {
                processedInput: {
                    options: {
                        openApiVersion: '3.0.0'
                    }
                }
            }
            let expected = new DefinitionGenerator(serverlessObj, {})
            expect(expected.version).to.be.equal('3.0.0')

            serverlessObj = {
                processedInput: {
                    options: {
                        openApiVersion: '3.0.1'
                    }
                }
            }
            expected = new DefinitionGenerator(serverlessObj, {})
            expect(expected.version).to.be.equal('3.0.1')
        });

        it('should correctly resolve the RefParserOptions', async function() {
            let expected = new DefinitionGenerator({}, {})
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

            expected = new DefinitionGenerator({}, {})
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

    describe('createInfo', () => {
        it('should create openAPI info object correctly', function() {
            const definitionGenerator = new DefinitionGenerator(mockServerless)
            definitionGenerator.createInfo()

            expect(definitionGenerator.openAPI).to.be.an('object')
            expect(definitionGenerator.openAPI.info).to.be.an('object')
            expect(definitionGenerator.openAPI.info).to.deep.equal(mockServerless.service.custom.documentation)
        });

        it('should use the service name when documentation title has not been supplied', function() {
            delete mockServerless.service.custom.documentation.title
            const definitionGenerator = new DefinitionGenerator(mockServerless)
            definitionGenerator.createInfo()

            expect(definitionGenerator.openAPI).to.be.an('object')
            expect(definitionGenerator.openAPI.info).to.be.an('object')
            expect(definitionGenerator.openAPI.info.title).to.be.equal(mockServerless.service.service)
        });

        it('should use the service name when documentation description has not been supplied', function() {
            delete mockServerless.service.custom.documentation.description
            const definitionGenerator = new DefinitionGenerator(mockServerless)
            definitionGenerator.createInfo()

            expect(definitionGenerator.openAPI).to.be.an('object')
            expect(definitionGenerator.openAPI.info).to.be.an('object')
            expect(definitionGenerator.openAPI.info.description).to.be.equal('')
        });

        it('should use an empty string when documentation description has not been supplied', function() {
            delete mockServerless.service.custom.documentation.description
            const definitionGenerator = new DefinitionGenerator(mockServerless)
            definitionGenerator.createInfo()

            expect(definitionGenerator.openAPI).to.be.an('object')
            expect(definitionGenerator.openAPI.info).to.be.an('object')
            expect(definitionGenerator.openAPI.info.description).to.be.equal('')
        });

        it('should generate a uuid for version when documentation version has not been supplied', function() {
            delete mockServerless.service.custom.documentation.version

            const definitionGenerator = new DefinitionGenerator(mockServerless)
            definitionGenerator.createInfo()

            expect(definitionGenerator.openAPI).to.be.an('object')
            expect(definitionGenerator.openAPI.info).to.be.an('object')
            expect(v4.test(definitionGenerator.openAPI.info.version)).to.be.true
        });
    });

    describe('createTags', () => {
        it('should add tags to the openAPI object correctly', function() {
            mockServerless.service.custom.documentation.tags = [{name: 'tag1'}]

            const definitionGenerator = new DefinitionGenerator(mockServerless)
            definitionGenerator.createTags()

            expect(definitionGenerator.openAPI).to.be.an('object')
            expect(definitionGenerator.openAPI.tags).to.be.an('array')
            expect(definitionGenerator.openAPI.tags[0].name).to.be.equal('tag1')
        });

        it('should not add tags when they are not defined', function() {
            const definitionGenerator = new DefinitionGenerator(mockServerless)
            expect(() => {
                definitionGenerator.createTags()
            }).to.throw()
        });
    });

    describe('schemaCreator', () => {
        describe('schemas that are objects', () => {
            it('should add a simple schema to the components object', async function() {
                const simpleSchema = {
                    type: 'string'
                }
                const definitionGenerator = new DefinitionGenerator(mockServerless)
                const expected = await definitionGenerator.schemaCreator(simpleSchema, 'simpleSchema')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('simpleSchema')
                expect(JSON.stringify(definitionGenerator.openAPI.components.schemas.simpleSchema)).to.equal(JSON.stringify(simpleSchema))
                expect(expected).to.equal('#/components/schemas/simpleSchema')
            });

            it('should add a complex schema to the components object', async function() {
                const complexSchema = {
                   type: 'object',
                   properties: {
                       error: {
                           type: 'string'
                       }
                   }
                }
                const definitionGenerator = new DefinitionGenerator(mockServerless)
                const expected = await definitionGenerator.schemaCreator(complexSchema, 'main')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('main')
                expect(JSON.stringify(definitionGenerator.openAPI.components.schemas.main)).to.equal(JSON.stringify(complexSchema))
                expect(expected).to.equal('#/components/schemas/main')
            });

            it('should add each definition of a complex schema to the components object', async function() {
                const complexSchema = {
                    "$schema": "http://json-schema.org/draft-04/schema#",
                    "title": "JSON API Schema",
                    "description": "This is a blah blah for responses in the JSON API format. For more, see http://jsonapi.org",
                    "type": "object",
                    "required": [
                        "errors"
                    ],
                    "properties": {
                        "errors": {
                            "type": "array",
                            "items": {
                                "$ref": "#/definitions/error"
                            },
                            "uniqueItems": true
                        }
                    },
                    "definitions": {
                        "error": {
                            "type": "object",
                            "properties": {
                                "id": {
                                    "description": "A unique identifier for this particular occurrence of the problem.",
                                    "type": "string"
                                }
                            }
                        }
                    }
                }
                const definitionGenerator = new DefinitionGenerator(mockServerless)
                const expected = await definitionGenerator.schemaCreator(complexSchema, 'PutRequest')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('PutRequest')
                expect(definitionGenerator.openAPI.components.schemas).to.not.have.property('error')
                expect(expected).to.equal('#/components/schemas/PutRequest')
            });

            it(`should not overwrite an object that already exists in the components if they're the same`, async function() {
                const complexSchema = {
                    "$schema": "http://json-schema.org/draft-04/schema#",
                    "title": "JSON API Schema",
                    "description": "This is a blah blah for responses in the JSON API format. For more, see http://jsonapi.org",
                    "type": "object",
                    "required": [
                        "errors"
                    ],
                    "properties": {
                        "errors": {
                            "type": "array",
                            "items": {
                                "$ref": "#/definitions/error"
                            },
                            "uniqueItems": true
                        }
                    },
                    "definitions": {
                        "error": {
                            "type": "object",
                            "properties": {
                                "id": {
                                    "description": "A unique identifier for this particular occurrence of the problem.",
                                    "type": "string"
                                }
                            }
                        }
                    }
                }
                const definitionGenerator = new DefinitionGenerator(mockServerless)
                let expected = await definitionGenerator.schemaCreator(complexSchema, 'PutRequest')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('PutRequest')
                expect(definitionGenerator.openAPI.components.schemas).to.not.have.property('error')
                expect(expected).to.equal('#/components/schemas/PutRequest')

                expected = await definitionGenerator.schemaCreator(complexSchema, 'PutRequest')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('PutRequest')
                expect(definitionGenerator.openAPI.components.schemas).to.not.have.property('error')
                expect(expected).to.equal('#/components/schemas/PutRequest')
            });

            it(`should create a new object for a similarly named object but with different properties`, async function() {
                const complexSchema = {
                    "$schema": "http://json-schema.org/draft-04/schema#",
                    "title": "JSON API Schema",
                    "description": "This is a blah blah for responses in the JSON API format. For more, see http://jsonapi.org",
                    "type": "object",
                    "required": [
                        "errors"
                    ],
                    "properties": {
                        "errors": {
                            "type": "array",
                            "items": {
                                "$ref": "#/definitions/error"
                            },
                            "uniqueItems": true
                        }
                    },
                    "definitions": {
                        "error": {
                            "type": "object",
                            "properties": {
                                "id": {
                                    "description": "A unique identifier for this particular occurrence of the problem.",
                                    "type": "string"
                                }
                            }
                        }
                    }
                }
                const definitionGenerator = new DefinitionGenerator(mockServerless)
                let expected = await definitionGenerator.schemaCreator(complexSchema, 'PutRequest')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('PutRequest')
                expect(definitionGenerator.openAPI.components.schemas).to.not.have.property('error')
                expect(expected).to.equal('#/components/schemas/PutRequest')

                complexSchema.properties.cheese = {
                    type: 'string'
                }

                expected = await definitionGenerator.schemaCreator(complexSchema, 'PutRequest')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('PutRequest')
                expect(definitionGenerator.openAPI.components.schemas).to.not.have.property('error')

                let newSchemaStr = expected.split('/')
                expect(v4.test(newSchemaStr[newSchemaStr.length-1].split('PutRequest-')[1])).to.be.true
                expect(definitionGenerator.openAPI.components.schemas).to.have.property(newSchemaStr[newSchemaStr.length-1])

                // expected = await definitionGenerator.schemaCreator(complexSchema, 'PutRequest')
                //     .catch((err) => {
                //         console.error(err)
                //     })

                // expect(definitionGenerator.openAPI.components.schemas).to.have.property('PutRequest')
                // expect(definitionGenerator.openAPI.components.schemas).to.have.property('error')
                // console.log(expected)
                // expect(expected)
                // expect(expected).to.equal('#/components/schemas/PutRequest1')

                complexSchema.properties.wine = {
                    type: 'string'
                }

                expected = await definitionGenerator.schemaCreator(complexSchema, 'PutRequest')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('PutRequest')
                expect(definitionGenerator.openAPI.components.schemas).to.not.have.property('error')
                expect(definitionGenerator.openAPI.components.schemas).to.have.property(newSchemaStr[newSchemaStr.length-1])
                newSchemaStr = expected.split('/')
                expect(v4.test(newSchemaStr[newSchemaStr.length-1].split('PutRequest-')[1])).to.be.true
                expect(definitionGenerator.openAPI.components.schemas).to.have.property(newSchemaStr[newSchemaStr.length-1])
            });

            it(`should create a new object for a differently named object but with same properties`, async function() {
                const complexSchema = {
                    "$schema": "http://json-schema.org/draft-04/schema#",
                    "title": "JSON API Schema",
                    "description": "This is a blah blah for responses in the JSON API format. For more, see http://jsonapi.org",
                    "type": "object",
                    "required": [
                        "errors"
                    ],
                    "properties": {
                        "errors": {
                            "type": "array",
                            "items": {
                                "$ref": "#/definitions/error"
                            },
                            "uniqueItems": true
                        }
                    },
                    "definitions": {
                        "error": {
                            "type": "object",
                            "properties": {
                                "id": {
                                    "description": "A unique identifier for this particular occurrence of the problem.",
                                    "type": "string"
                                }
                            }
                        }
                    }
                }
                const definitionGenerator = new DefinitionGenerator(mockServerless)
                let expected = await definitionGenerator.schemaCreator(complexSchema, 'PutRequest')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('PutRequest')
                expect(definitionGenerator.openAPI.components.schemas).to.not.have.property('error')
                expect(expected).to.equal('#/components/schemas/PutRequest')

                expected = await definitionGenerator.schemaCreator(complexSchema, 'ContactPutRequest')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('PutRequest')
                expect(definitionGenerator.openAPI.components.schemas).to.not.have.property('error')
                expect(definitionGenerator.openAPI.components.schemas).to.have.property('ContactPutRequest')
                expect(expected).to.equal('#/components/schemas/ContactPutRequest')
            });
        });

        describe('schemas that are urls', () => {
            it('should attempt to download a schema and convert it', async function() {
                const simpleSchema = 'https:///google.com/build/LicensedMember.json'
                const LicensedMemberJSON = require('../json/complex.json')

                const stub = sinon.stub($RefParser, 'dereference').resolves(LicensedMemberJSON)
                const definitionGenerator = new DefinitionGenerator(mockServerless)
                const expected = await definitionGenerator.schemaCreator(simpleSchema, 'LicensedMember')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('LicensedMember')
                expect(definitionGenerator.openAPI.components.schemas).to.have.property('log')
                expect(definitionGenerator.openAPI.components.schemas).to.have.property('template')
                expect(definitionGenerator.openAPI.components.schemas).to.have.property('database')
                expect(expected).to.equal('#/components/schemas/LicensedMember')

                stub.restore()
            });

            it('should take a mix of schemas', async function() {
                const complexSchema = 'https:///google.com/build/LicensedMember.json'
                const LicensedMemberJSON = require('../json/complex.json')

                const stub = sinon.stub($RefParser, 'dereference').resolves(LicensedMemberJSON)
                const definitionGenerator = new DefinitionGenerator(mockServerless)
                let expected = await definitionGenerator.schemaCreator(complexSchema, 'LicensedMember')
                    .catch((err) => {
                        console.error(err)
                    })

                const simpleSchema = {
                    type: "object",
                    properties: {
                        UUID: {
                            $ref: "#/definitions/log"
                        },
                        name: {
                            type: "string"
                        }
                    },
                    definitions: {}
                }

                expected = await definitionGenerator.schemaCreator(simpleSchema, 'simpleSchema')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('LicensedMember')
                expect(definitionGenerator.openAPI.components.schemas).to.have.property('log')
                expect(definitionGenerator.openAPI.components.schemas).to.have.property('template')
                expect(definitionGenerator.openAPI.components.schemas).to.have.property('database')
                expect(definitionGenerator.openAPI.components.schemas).to.have.property('simpleSchema')
                expect(expected).to.equal('#/components/schemas/simpleSchema')

                stub.restore()
            });

            it('should throw an error when a url can not be resolved', async function() {
                const simpleSchema = 'https:///google.com/build/LicensedMember.json'

                const stub = sinon.stub($RefParser, 'dereference').rejects(new Error())
                const definitionGenerator = new DefinitionGenerator(mockServerless)
                const expected = await definitionGenerator.schemaCreator(simpleSchema, 'simpleSchema')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(expected).to.be.undefined

                stub.restore()
            });
        });
    });
});
