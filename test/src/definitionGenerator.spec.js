'use strict'

const path = require('path')

const sinon = require('sinon')
const expect = require('chai').expect

const DefinitionGenerator = require('../../src/definitionGenerator')
const $RefParser = require("@apidevtools/json-schema-ref-parser");

describe('DefinitionGenerator', () => {
    let definitionGenerator
    let simpleServerless = {
        processedInput: {
            options: {
                openApiVersion: '3.0.0'
            }
        }
    }

    beforeEach(function() {
        definitionGenerator = new DefinitionGenerator(simpleServerless, {})
    });

    describe('schemaCreator', () => {
        describe('schemas that are objects', () => {
            it('should add a simple schema to the components object', async function() {
                const simpleSchema = {
                    type: 'string'
                }

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

                const expected = await definitionGenerator.schemaCreator(complexSchema, 'PutRequest')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('PutRequest')
                expect(definitionGenerator.openAPI.components.schemas).to.have.property('error')
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

                let expected = await definitionGenerator.schemaCreator(complexSchema, 'PutRequest')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('PutRequest')
                expect(definitionGenerator.openAPI.components.schemas).to.have.property('error')
                expect(expected).to.equal('#/components/schemas/PutRequest')

                expected = await definitionGenerator.schemaCreator(complexSchema, 'PutRequest')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('PutRequest')
                expect(definitionGenerator.openAPI.components.schemas).to.have.property('error')
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

                let expected = await definitionGenerator.schemaCreator(complexSchema, 'PutRequest')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('PutRequest')
                expect(definitionGenerator.openAPI.components.schemas).to.have.property('error')
                expect(expected).to.equal('#/components/schemas/PutRequest')

                complexSchema.properties.cheese = {
                    type: 'string'
                }

                expected = await definitionGenerator.schemaCreator(complexSchema, 'PutRequest')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('PutRequest')
                expect(definitionGenerator.openAPI.components.schemas).to.have.property('error')
                expect(expected).to.equal('#/components/schemas/PutRequest1')

                expected = await definitionGenerator.schemaCreator(complexSchema, 'PutRequest')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('PutRequest')
                expect(definitionGenerator.openAPI.components.schemas).to.have.property('error')
                expect(expected).to.equal('#/components/schemas/PutRequest1')

                complexSchema.properties.wine = {
                    type: 'string'
                }

                expected = await definitionGenerator.schemaCreator(complexSchema, 'PutRequest')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('PutRequest')
                expect(definitionGenerator.openAPI.components.schemas).to.have.property('error')
                expect(expected).to.equal('#/components/schemas/PutRequest2')
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

                let expected = await definitionGenerator.schemaCreator(complexSchema, 'PutRequest')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('PutRequest')
                expect(definitionGenerator.openAPI.components.schemas).to.have.property('error')
                expect(expected).to.equal('#/components/schemas/PutRequest')

                expected = await definitionGenerator.schemaCreator(complexSchema, 'ContactPutRequest')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('PutRequest')
                expect(definitionGenerator.openAPI.components.schemas).to.have.property('error')
                expect(definitionGenerator.openAPI.components.schemas).to.have.property('ContactPutRequest')
                expect(expected).to.equal('#/components/schemas/ContactPutRequest')
            });

            it('should not create an object that already references schemas in components', async function() {
                const simpleSchema = {
                    "$schema": "http://json-schema.org/draft-04/schema#",
                    "title": "JSON API Schema",
                    "description": "This is a blah blah for responses in the JSON API format. For more, see http://jsonapi.org",
                    "type": "object",
                    "properties": {
                        "meta": {
                            "type": "string",

                        }
                    }
                }

                let expected = await definitionGenerator.schemaCreator(simpleSchema, 'meta')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(expected).to.equal('#/components/schemas/meta')

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
                        },
                        "meta": {
                            "$ref": "#/definitions/meta"
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

                expected = await definitionGenerator.schemaCreator(complexSchema, 'PutRequest')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('PutRequest')
                expect(definitionGenerator.openAPI.components.schemas).to.have.property('error')
                expect(expected).to.equal('#/components/schemas/PutRequest')
            });
        });

        describe('schemas that are urls', () => {
            it('should attempt to download a schema and convert it', async function() {
                const simpleSchema = 'https:///google.com/build/LicensedMember.json'
                const LicensedMemberJSON = require('../json/complex.json')

                const stub = sinon.stub($RefParser, 'dereference').resolves(LicensedMemberJSON)

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
