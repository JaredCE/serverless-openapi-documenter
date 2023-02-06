'use strict'

const fs = require('fs').promises
const path = require('path')
const sinon = require('sinon')
const $RefParser = require("@apidevtools/json-schema-ref-parser")
const nock = require('nock')
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

        it('should assign a contact Object when a contact object is included', function() {
            mockServerless.service.custom.documentation.contact = {
                name: 'John',
                url: 'http://example.com',
                email: 'john@example.com'
            }
            const definitionGenerator = new DefinitionGenerator(mockServerless)
            definitionGenerator.createInfo()

            expect(definitionGenerator.openAPI).to.be.an('object')
            expect(definitionGenerator.openAPI.info).to.be.an('object')
            expect(definitionGenerator.openAPI.info).to.have.property('contact')
            expect(definitionGenerator.openAPI.info.contact).to.be.an('object')
            expect(definitionGenerator.openAPI.info.contact.name).to.be.an('string')
        });

        it('should only assign a contact url if one is provided', function() {
            mockServerless.service.custom.documentation.contact = {
                name: 'John',
                email: 'john@example.com'
            }
            const definitionGenerator = new DefinitionGenerator(mockServerless)
            definitionGenerator.createInfo()

            expect(definitionGenerator.openAPI).to.be.an('object')
            expect(definitionGenerator.openAPI.info).to.be.an('object')
            expect(definitionGenerator.openAPI.info).to.have.property('contact')
            expect(definitionGenerator.openAPI.info.contact).to.be.an('object')
            expect(definitionGenerator.openAPI.info.contact.name).to.be.an('string')
            expect(definitionGenerator.openAPI.info.contact).to.not.have.property('url')
        });

        it('should assign a license Object when a license object is included with a name', function() {
            mockServerless.service.custom.documentation.license = {
                name: 'Apache 2.0',
                url: 'https://www.apache.org/licenses/LICENSE-2.0.html',
            }
            const definitionGenerator = new DefinitionGenerator(mockServerless)
            definitionGenerator.createInfo()

            expect(definitionGenerator.openAPI).to.be.an('object')
            expect(definitionGenerator.openAPI.info).to.be.an('object')
            expect(definitionGenerator.openAPI.info).to.have.property('license')
            expect(definitionGenerator.openAPI.info.license).to.be.an('object')
            expect(definitionGenerator.openAPI.info.license.name).to.be.an('string')
        });

        it('should not assign a license Object when a license object is included without a name', function() {
            mockServerless.service.custom.documentation.license = {
                url: 'https://www.apache.org/licenses/LICENSE-2.0.html',
            }
            const definitionGenerator = new DefinitionGenerator(mockServerless)
            definitionGenerator.createInfo()

            expect(definitionGenerator.openAPI).to.be.an('object')
            expect(definitionGenerator.openAPI.info).to.be.an('object')
            expect(definitionGenerator.openAPI.info).to.not.have.property('license')
        });

        it('should only assign a contact url if one is provided', function() {
            mockServerless.service.custom.documentation.license = {
                name: 'John',
            }
            const definitionGenerator = new DefinitionGenerator(mockServerless)
            definitionGenerator.createInfo()

            expect(definitionGenerator.openAPI).to.be.an('object')
            expect(definitionGenerator.openAPI.info).to.be.an('object')
            expect(definitionGenerator.openAPI.info).to.have.property('license')
            expect(definitionGenerator.openAPI.info.license).to.be.an('object')
            expect(definitionGenerator.openAPI.info.license.name).to.be.an('string')
            expect(definitionGenerator.openAPI.info.license).to.not.have.property('url')
        });

        it('should assign specification extension fields when included', function() {
            mockServerless.service.custom.documentation['x-field'] = 'john'
            const definitionGenerator = new DefinitionGenerator(mockServerless)
            definitionGenerator.createInfo()

            expect(definitionGenerator.openAPI).to.be.an('object')
            expect(definitionGenerator.openAPI.info).to.be.an('object')
            expect(definitionGenerator.openAPI.info).to.have.property('x-field')
            expect(definitionGenerator.openAPI.info['x-field']).to.be.equal('john')
        });

        it('should ignore fields that do not conform to specifiction extension', function() {
            mockServerless.service.custom.documentation.otherField = 'john'
            const definitionGenerator = new DefinitionGenerator(mockServerless)
            definitionGenerator.createInfo()

            expect(definitionGenerator.openAPI).to.be.an('object')
            expect(definitionGenerator.openAPI.info).to.be.an('object')
            expect(definitionGenerator.openAPI.info).to.not.have.property('otherField')
        });
    });

    describe('createSecuritySchemes', () => {
        describe('API Keys', () => {
            it('should add an API Key security scheme to components', function() {
                mockServerless.service.custom.documentation.securitySchemes = {
                    'api_key': {
                        type: 'apiKey',
                        name: 'Authorization',
                        in: 'header'
                    }
                }

                const definitionGenerator = new DefinitionGenerator(mockServerless)
                definitionGenerator.createSecuritySchemes(mockServerless.service.custom.documentation.securitySchemes)

                expect(definitionGenerator.openAPI).to.be.an('object')
                expect(definitionGenerator.openAPI.components).to.be.an('object')
                expect(definitionGenerator.openAPI.components).to.have.property('securitySchemes')
                expect(definitionGenerator.openAPI.components.securitySchemes).to.be.an('object')
                expect(definitionGenerator.openAPI.components.securitySchemes).to.have.property('api_key')
                expect(definitionGenerator.openAPI.components.securitySchemes.api_key).to.have.property('type')
                expect(definitionGenerator.openAPI.components.securitySchemes.api_key.type).to.be.equal('apiKey')
            });

            it('should throw an error when name is missing from an API Key scheme', function() {
                mockServerless.service.custom.documentation.securitySchemes = {
                    'api_key': {
                        type: 'apiKey',
                        in: 'header'
                    }
                }

                const definitionGenerator = new DefinitionGenerator(mockServerless)
                expect(() => {
                    definitionGenerator.createSecuritySchemes(mockServerless.service.custom.documentation.securitySchemes)
                }).to.throw('Security Scheme for "apiKey" requires the name of the header, query or cookie parameter to be used')
            });

            it('should throw an error when in is missing from an API Key scheme', function() {
                mockServerless.service.custom.documentation.securitySchemes = {
                    'api_key': {
                        type: 'apiKey',
                        name: 'Authorization',
                    }
                }

                const definitionGenerator = new DefinitionGenerator(mockServerless)
                expect(() => {
                    definitionGenerator.createSecuritySchemes(mockServerless.service.custom.documentation.securitySchemes)
                }).to.throw('Security Scheme for "apiKey" requires the location of the API key: header, query or cookie parameter')
            });
        });

        describe('HTTP', () => {
            it('should add an HTTP security scheme to components', function() {
                mockServerless.service.custom.documentation.securitySchemes = {
                    'http_key': {
                        type: 'http',
                        scheme: 'basic'
                    }
                }

                const definitionGenerator = new DefinitionGenerator(mockServerless)
                definitionGenerator.createSecuritySchemes(mockServerless.service.custom.documentation.securitySchemes)

                expect(definitionGenerator.openAPI).to.be.an('object')
                expect(definitionGenerator.openAPI.components).to.be.an('object')
                expect(definitionGenerator.openAPI.components).to.have.property('securitySchemes')
                expect(definitionGenerator.openAPI.components.securitySchemes).to.be.an('object')
                expect(definitionGenerator.openAPI.components.securitySchemes).to.have.property('http_key')
            });

            it('should throw an error when scheme is missing from an HTTP scheme', function() {
                mockServerless.service.custom.documentation.securitySchemes = {
                    'http_key': {
                        type: 'http',
                    }
                }

                const definitionGenerator = new DefinitionGenerator(mockServerless)
                expect(() => {
                    definitionGenerator.createSecuritySchemes(mockServerless.service.custom.documentation.securitySchemes)
                }).to.throw('Security Scheme for "http" requires scheme')
            });
        });

        describe('openIdConnect', () => {
            it('should add an openIdConnect security scheme to components', function() {
                mockServerless.service.custom.documentation.securitySchemes = {
                    'openIdConnect_key': {
                        type: 'openIdConnect',
                        openIdConnectUrl: 'http://example.com'
                    }
                }

                const definitionGenerator = new DefinitionGenerator(mockServerless)
                definitionGenerator.createSecuritySchemes(mockServerless.service.custom.documentation.securitySchemes)

                expect(definitionGenerator.openAPI).to.be.an('object')
                expect(definitionGenerator.openAPI.components).to.be.an('object')
                expect(definitionGenerator.openAPI.components).to.have.property('securitySchemes')
                expect(definitionGenerator.openAPI.components.securitySchemes).to.be.an('object')
                expect(definitionGenerator.openAPI.components.securitySchemes).to.have.property('openIdConnect_key')
            });

            it('should throw an error when openIdConnectUrl is missing from an openIdConnect scheme', function() {
                mockServerless.service.custom.documentation.securitySchemes = {
                    'openIdConnect_key': {
                        type: 'openIdConnect',
                    }
                }

                const definitionGenerator = new DefinitionGenerator(mockServerless)
                expect(() => {
                    definitionGenerator.createSecuritySchemes(mockServerless.service.custom.documentation.securitySchemes)
                }).to.throw('Security Scheme for "openIdConnect" requires openIdConnectUrl')
            });
        });

        describe('oauth2', () => {
            it('should add an oauth2 security scheme to components', function() {
                mockServerless.service.custom.documentation.securitySchemes = {
                    'oAuth2_key': {
                        type: 'oauth2',
                        flows: {
                            implicit: {
                                authorizationUrl: 'http://example.org/api/oauth/dialog',
                                scopes: {
                                    'write:pets': 'modify pets in your account',
                                    'read:pets': 'read your pets'
                                }
                            }
                        }
                    }
                }

                const definitionGenerator = new DefinitionGenerator(mockServerless)
                definitionGenerator.createSecuritySchemes(mockServerless.service.custom.documentation.securitySchemes)

                expect(definitionGenerator.openAPI).to.be.an('object')
                expect(definitionGenerator.openAPI.components).to.be.an('object')
                expect(definitionGenerator.openAPI.components).to.have.property('securitySchemes')
                expect(definitionGenerator.openAPI.components.securitySchemes).to.be.an('object')
                expect(definitionGenerator.openAPI.components.securitySchemes).to.have.property('oAuth2_key')
                expect(definitionGenerator.openAPI.components.securitySchemes.oAuth2_key).to.be.an('object')
                expect(definitionGenerator.openAPI.components.securitySchemes.oAuth2_key).to.have.property('type')
                expect(definitionGenerator.openAPI.components.securitySchemes.oAuth2_key).to.have.property('flows')
                expect(definitionGenerator.openAPI.components.securitySchemes.oAuth2_key.flows).to.be.an('object')
                expect(definitionGenerator.openAPI.components.securitySchemes.oAuth2_key.flows).to.have.property('implicit')
                expect(definitionGenerator.openAPI.components.securitySchemes.oAuth2_key.flows.implicit).to.be.an('object')
                expect(definitionGenerator.openAPI.components.securitySchemes.oAuth2_key.flows.implicit).to.have.property('scopes')
                expect(definitionGenerator.openAPI.components.securitySchemes.oAuth2_key.flows.implicit.scopes).to.be.an('object')
            });

            it('should throw an error when flows is missing from an oauth2 scheme', function() {
                mockServerless.service.custom.documentation.securitySchemes = {
                    'oAuth2_key': {
                        type: 'oauth2',
                    }
                }

                const definitionGenerator = new DefinitionGenerator(mockServerless)
                expect(() => {
                    definitionGenerator.createSecuritySchemes(mockServerless.service.custom.documentation.securitySchemes)
                }).to.throw('Security Scheme for "oauth2" requires flows')
            });

            it('should throw an error when authorizationUrl is missing from an oauth2 implicit flow scheme', function() {
                mockServerless.service.custom.documentation.securitySchemes = {
                    'oAuth2_key': {
                        type: 'oauth2',
                        flows: {
                            implicit: {
                                scopes: {
                                    'write:pets': 'modify pets in your account',
                                    'read:pets': 'read your pets'
                                }
                            }
                        }
                    }
                }

                const definitionGenerator = new DefinitionGenerator(mockServerless)
                expect(() => {
                    definitionGenerator.createSecuritySchemes(mockServerless.service.custom.documentation.securitySchemes)
                }).to.throw('oAuth2 implicit flow requires an authorizationUrl')
            });

            it('should throw an error when authorizationUrl is missing from an oauth2 authorizationCode flow scheme', function() {
                mockServerless.service.custom.documentation.securitySchemes = {
                    'oAuth2_key': {
                        type: 'oauth2',
                        flows: {
                            authorizationCode: {
                                tokenUrl: 'http://example.com',
                                scopes: {
                                    'write:pets': 'modify pets in your account',
                                    'read:pets': 'read your pets'
                                }
                            }
                        }
                    }
                }

                const definitionGenerator = new DefinitionGenerator(mockServerless)
                expect(() => {
                    definitionGenerator.createSecuritySchemes(mockServerless.service.custom.documentation.securitySchemes)
                }).to.throw('oAuth2 authorizationCode flow requires an authorizationUrl')
            });

            it('should throw an error when tokenUrl is missing from an oauth2 authorizationCode flow scheme', function() {
                mockServerless.service.custom.documentation.securitySchemes = {
                    'oAuth2_key': {
                        type: 'oauth2',
                        flows: {
                            authorizationCode: {
                                authorizationUrl: 'http://example.org/api/oauth/dialog',
                                scopes: {
                                    'write:pets': 'modify pets in your account',
                                    'read:pets': 'read your pets'
                                }
                            }
                        }
                    }
                }

                const definitionGenerator = new DefinitionGenerator(mockServerless)
                expect(() => {
                    definitionGenerator.createSecuritySchemes(mockServerless.service.custom.documentation.securitySchemes)
                }).to.throw('oAuth2 authorizationCode flow requires a tokenUrl')
            });

            it('should throw an error when tokenUrl is missing from an oauth2 password flow scheme', function() {
                mockServerless.service.custom.documentation.securitySchemes = {
                    'oAuth2_key': {
                        type: 'oauth2',
                        flows: {
                            password: {
                                scopes: {
                                    'write:pets': 'modify pets in your account',
                                    'read:pets': 'read your pets'
                                }
                            }
                        }
                    }
                }

                const definitionGenerator = new DefinitionGenerator(mockServerless)
                expect(() => {
                    definitionGenerator.createSecuritySchemes(mockServerless.service.custom.documentation.securitySchemes)
                }).to.throw('oAuth2 password flow requires a tokenUrl')
            });

            it('should throw an error when tokenUrl is missing from an oauth2 clientCredentials flow scheme', function() {
                mockServerless.service.custom.documentation.securitySchemes = {
                    'oAuth2_key': {
                        type: 'oauth2',
                        flows: {
                            clientCredentials: {
                                scopes: {
                                    'write:pets': 'modify pets in your account',
                                    'read:pets': 'read your pets'
                                }
                            }
                        }
                    }
                }

                const definitionGenerator = new DefinitionGenerator(mockServerless)
                expect(() => {
                    definitionGenerator.createSecuritySchemes(mockServerless.service.custom.documentation.securitySchemes)
                }).to.throw('oAuth2 clientCredentials flow requires a tokenUrl')
            });

            it('should throw an error when scopes is missing from an oauth2 clientCredentials flow scheme', function() {
                mockServerless.service.custom.documentation.securitySchemes = {
                    'oAuth2_key': {
                        type: 'oauth2',
                        flows: {
                            clientCredentials: {
                                tokenUrl: 'http://example.com',
                            }
                        }
                    }
                }

                const definitionGenerator = new DefinitionGenerator(mockServerless)
                expect(() => {
                    definitionGenerator.createSecuritySchemes(mockServerless.service.custom.documentation.securitySchemes)
                }).to.throw('oAuth2 clientCredentials flow requires scopes')
            });

            it('should throw an error when scopes is missing from an oauth2 authorizationCode flow scheme', function() {
                mockServerless.service.custom.documentation.securitySchemes = {
                    'oAuth2_key': {
                        type: 'oauth2',
                        flows: {
                            authorizationCode: {
                                tokenUrl: 'http://example.com',
                                authorizationUrl: 'http://example.org/api/oauth/dialog',
                            }
                        }
                    }
                }

                const definitionGenerator = new DefinitionGenerator(mockServerless)
                expect(() => {
                    definitionGenerator.createSecuritySchemes(mockServerless.service.custom.documentation.securitySchemes)
                }).to.throw('oAuth2 authorizationCode flow requires scopes')
            });

            it('should throw an error when scopes is missing from an oauth2 password flow scheme', function() {
                mockServerless.service.custom.documentation.securitySchemes = {
                    'oAuth2_key': {
                        type: 'oauth2',
                        flows: {
                            password: {
                                tokenUrl: 'http://example.com',
                            }
                        }
                    }
                }

                const definitionGenerator = new DefinitionGenerator(mockServerless)
                expect(() => {
                    definitionGenerator.createSecuritySchemes(mockServerless.service.custom.documentation.securitySchemes)
                }).to.throw('oAuth2 password flow requires scopes')
            });

            it('should throw an error when scopes is missing from an oauth2 implicit flow scheme', function() {
                mockServerless.service.custom.documentation.securitySchemes = {
                    'oAuth2_key': {
                        type: 'oauth2',
                        flows: {
                            implicit: {
                                authorizationUrl: 'http://example.org/api/oauth/dialog',
                            }
                        }
                    }
                }

                const definitionGenerator = new DefinitionGenerator(mockServerless)
                expect(() => {
                    definitionGenerator.createSecuritySchemes(mockServerless.service.custom.documentation.securitySchemes)
                }).to.throw('oAuth2 implicit flow requires scopes')
            });
        });

        describe('Multiple Schemes', () => {
            it('should add an oauth2 and an apiKey security scheme to components', function() {
                mockServerless.service.custom.documentation.securitySchemes = {
                    'oAuth2_key': {
                        type: 'oauth2',
                        flows: {
                            implicit: {
                                authorizationUrl: 'http://example.org/api/oauth/dialog',
                                scopes: {
                                    'write:pets': 'modify pets in your account',
                                    'read:pets': 'read your pets'
                                }
                            }
                        }
                    },
                    'api_key': {
                        type: 'apiKey',
                        name: 'Authorization',
                        in: 'header'
                    }
                }

                const definitionGenerator = new DefinitionGenerator(mockServerless)
                definitionGenerator.createSecuritySchemes(mockServerless.service.custom.documentation.securitySchemes)
                expect(definitionGenerator.openAPI).to.be.an('object')
                expect(definitionGenerator.openAPI.components).to.be.an('object')
                expect(definitionGenerator.openAPI.components).to.have.property('securitySchemes')
                expect(definitionGenerator.openAPI.components.securitySchemes).to.be.an('object')
                expect(definitionGenerator.openAPI.components.securitySchemes).to.have.property('oAuth2_key')
                expect(definitionGenerator.openAPI.components.securitySchemes).to.have.property('api_key')
            });
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

            it('should not overwrite a schema that has the same name and same schema as a pre-existing schema', async function() {
                const definitionGenerator = new DefinitionGenerator(mockServerless)

                const spy = sinon.spy(definitionGenerator, 'addToComponents')

                const complexSchema = {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string'
                        }
                    }
                }

                let expected = await definitionGenerator.schemaCreator(complexSchema, 'main')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('main')
                expect(JSON.stringify(definitionGenerator.openAPI.components.schemas.main)).to.equal(JSON.stringify(complexSchema))
                expect(expected).to.equal('#/components/schemas/main')

                expected = await definitionGenerator.schemaCreator(complexSchema, 'main')
                     .catch((err) => {
                        console.error(err)
                    })

                expect(expected).to.equal('#/components/schemas/main')
                expect(spy.callCount).to.be.equal(1)

                spy.resetHistory()
            });

            it('should not overwrite a schema that has the same name and same schema as a pre-existing schema but in a slightly different order', async function() {
                const definitionGenerator = new DefinitionGenerator(mockServerless)

                const spy = sinon.spy(definitionGenerator, 'addToComponents')

                const complexSchema = {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            format: 'uuid'
                        }
                    }
                }

                let expected = await definitionGenerator.schemaCreator(complexSchema, 'main')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('main')
                expect(JSON.stringify(definitionGenerator.openAPI.components.schemas.main)).to.equal(JSON.stringify(complexSchema))
                expect(expected).to.equal('#/components/schemas/main')

                const complexSchema2 = {
                    type: 'object',
                    properties: {
                        error: {
                            format: 'uuid',
                            type: 'string'
                        }
                    }
                }

                expected = await definitionGenerator.schemaCreator(complexSchema2, 'main')
                     .catch((err) => {
                        console.error(err)
                    })

                expect(expected).to.equal('#/components/schemas/main')
                expect(spy.callCount).to.be.equal(1)

                spy.resetHistory()
            });

            it('should add a schema to components when a name already exists but the schema is different', async function() {
                const definitionGenerator = new DefinitionGenerator(mockServerless)

                const spy = sinon.spy(definitionGenerator, 'addToComponents')

                const complexSchema = {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string'
                        }
                    }
                }

                let expected = await definitionGenerator.schemaCreator(complexSchema, 'main')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('main')
                expect(JSON.stringify(definitionGenerator.openAPI.components.schemas.main)).to.equal(JSON.stringify(complexSchema))
                expect(expected).to.equal('#/components/schemas/main')

                const complexSchema2 = JSON.parse(JSON.stringify(complexSchema))
                complexSchema2.properties.error.format = 'uuid'

                expected = await definitionGenerator.schemaCreator(complexSchema2, 'main')
                     .catch((err) => {
                        console.error(err)
                    })

                const splitPath = expected.split('/')
                expect(v4.test(splitPath[3].split('main-')[1])).to.be.true
                expect(definitionGenerator.openAPI.components.schemas[splitPath[3]]).to.be.an('object')
                expect(definitionGenerator.openAPI.components.schemas[splitPath[3]].properties.error).to.have.property('format')
                expect(spy.callCount).to.be.equal(2)

                spy.resetHistory()
            });

            it('should correctly dereference a schema with definitions and add to the components', async function() {
                const definitionGenerator = new DefinitionGenerator(mockServerless)

                const complexSchema = {
                    type: 'object',
                    properties: {
                        error: {
                            '$ref': '#/definitions/error'
                        }
                    },
                    definitions: {
                        error: {
                            type: "string"
                        }
                    }
                }

                const spy = sinon.spy(definitionGenerator, 'dereferenceSchema')

                const expected = await definitionGenerator.schemaCreator(complexSchema, 'main')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('main')
                expect(definitionGenerator.openAPI.components.schemas.main.properties).to.have.property('error')
                expect(definitionGenerator.openAPI.components.schemas.main.properties.error).to.have.property('type')
                expect(definitionGenerator.openAPI.components.schemas.main.properties.error.type).to.be.equal('string')
                expect(definitionGenerator.openAPI.components.schemas.main).to.not.have.property('definitions')
                expect(expected).to.equal('#/components/schemas/main')

                expect(spy.callCount).to.be.equal(1)

                spy.resetHistory()
            });

            it('should handle a schema that has been incorrectly dereferenced', async function() {
                const definitionGenerator = new DefinitionGenerator(mockServerless)

                const complexSchema = {
                    $schema: 'http://json-schema.org/draft-04/schema#',
                    title: 'JSON API Schema',
                    $ref: '#/definitions/Error',
                    definitions: {
                        Error: {
                            type: 'string'
                        }
                    }
                }

                const spy = sinon.spy(definitionGenerator, 'dereferenceSchema')

                const expected = await definitionGenerator.schemaCreator(complexSchema, 'main')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('main')
                expect(definitionGenerator.openAPI.components.schemas.main).to.have.property('type')
                expect(definitionGenerator.openAPI.components.schemas.main.type).to.be.equal('string')
                expect(definitionGenerator.openAPI.components.schemas.main).to.not.have.property('$schema')
                expect(definitionGenerator.openAPI.components.schemas.main).to.not.have.property('$definitions')
                expect(expected).to.equal('#/components/schemas/main')

                expect(spy.callCount).to.be.equal(2)

                spy.resetHistory()
            });

            it('should handle a complex schema that has been incorrectly dereferenced', async function() {
                const definitionGenerator = new DefinitionGenerator(mockServerless)

                const complexSchema = {
                    $schema: 'http://json-schema.org/draft-04/schema#',
                    title: 'JSON API Schema',
                    $ref: '#/definitions/Person',
                    definitions: {
                        Person: {
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string'
                                },
                                age: {
                                    type: 'number'
                                }
                            }
                        }
                    }
                }

                const spy = sinon.spy(definitionGenerator, 'dereferenceSchema')

                const expected = await definitionGenerator.schemaCreator(complexSchema, 'main')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('main')
                expect(definitionGenerator.openAPI.components.schemas.main).to.have.property('type')
                expect(definitionGenerator.openAPI.components.schemas.main.type).to.be.equal('object')
                expect(definitionGenerator.openAPI.components.schemas.main).to.have.property('properties')
                expect(definitionGenerator.openAPI.components.schemas.main.properties).to.have.property('name')
                expect(definitionGenerator.openAPI.components.schemas.main.properties).to.have.property('age')
                expect(definitionGenerator.openAPI.components.schemas.main).to.not.have.property('$schema')
                expect(definitionGenerator.openAPI.components.schemas.main).to.not.have.property('$definitions')
                expect(expected).to.equal('#/components/schemas/main')

                expect(spy.callCount).to.be.equal(2)

                spy.resetHistory()
            });

            it('should add all schemas from a conversion to the components', async function() {
                const complexSchema = {
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
                }

                const definitionGenerator = new DefinitionGenerator(mockServerless)
                let expected = await definitionGenerator.schemaCreator(complexSchema, 'main')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(expected).to.equal('#/components/schemas/main')
                expect(definitionGenerator.openAPI.components.schemas).to.have.property('main')
                expect(Object.keys(definitionGenerator.openAPI.components.schemas).length).to.be.equal(2)

            });
        });

        describe('schemas that are urls', () => {
            it('should attempt to download a schema and convert it', async function() {
                const simpleSchema = 'https://google.com/build/LicensedMember.json'
                const LicensedMemberJSON = require('../json/complex.json')

                const scope = nock('https://google.com')
                    .get('/build/LicensedMember.json')
                    .reply(200, LicensedMemberJSON)

                const definitionGenerator = new DefinitionGenerator(mockServerless)
                const expected = await definitionGenerator.schemaCreator(simpleSchema, 'LicensedMember')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('LicensedMember')
                expect(definitionGenerator.openAPI.components.schemas.LicensedMember.properties).to.have.property('log')
                expect(definitionGenerator.openAPI.components.schemas.LicensedMember.properties).to.have.property('template')
                expect(definitionGenerator.openAPI.components.schemas.LicensedMember.properties).to.have.property('database')
                expect(expected).to.equal('#/components/schemas/LicensedMember')
            });

            it('should take a mix of schemas', async function() {
                const complexSchema = 'https://google.com/build/LicensedMember.json'
                const LicensedMemberJSON = require('../json/complex.json')

                const scope = nock('https://google.com')
                    .get('/build/LicensedMember.json')
                    .reply(200, LicensedMemberJSON)

                const definitionGenerator = new DefinitionGenerator(mockServerless)
                let expected = await definitionGenerator.schemaCreator(complexSchema, 'LicensedMember')
                    .catch((err) => {
                        console.error(err)
                    })

                // this will fail validation due to a missing definition
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
                        expect(err).to.be.an('error')
                        console.error(err)
                    })

                expect(expected).to.be.undefined
                expect(definitionGenerator.openAPI.components.schemas).to.have.property('LicensedMember')
                expect(definitionGenerator.openAPI.components.schemas.LicensedMember.properties).to.have.property('log')
                expect(definitionGenerator.openAPI.components.schemas.LicensedMember.properties).to.have.property('template')
                expect(definitionGenerator.openAPI.components.schemas.LicensedMember.properties).to.have.property('database')
            });

            it('should throw an error when a url can not be resolved', async function() {
                const simpleSchema = 'https://google.com/build/LicensedMember.json'

                const scope = nock('https://google.com')
                    .get('/build/LicensedMember.json')
                    .reply(404)

                const definitionGenerator = new DefinitionGenerator(mockServerless)
                const expected = await definitionGenerator.schemaCreator(simpleSchema, 'simpleSchema')
                    .catch((err) => {
                        expect(err).to.be.an('error')
                    })

                expect(expected).to.be.undefined
            });

            it('should handle a poorly dereferenced schema', async function() {
                const simpleSchema = 'https://google.com/build/LicensedMember.json'

                const externalSchema = {
                    $schema: 'http://json-schema.org/draft-04/schema#',
                    title: 'JSON API Schema',
                    $ref: '#/definitions/Error',
                    definitions: {
                        Error: {
                            type: 'string'
                        }
                    }
                }

                const scope = nock('https://google.com')
                    .get('/build/LicensedMember.json')
                    .reply(200, externalSchema)


                const definitionGenerator = new DefinitionGenerator(mockServerless)
                const expected = await definitionGenerator.schemaCreator(simpleSchema, 'LicensedMember')
                    .catch((err) => {
                        console.error(err)
                    })

                expect(definitionGenerator.openAPI.components.schemas).to.have.property('LicensedMember')
                expect(definitionGenerator.openAPI.components.schemas.LicensedMember).to.have.property('type')
                expect(definitionGenerator.openAPI.components.schemas.LicensedMember.type).to.be.equal('string')
                expect(definitionGenerator.openAPI.components.schemas.LicensedMember).to.not.have.property('$schema')
                expect(definitionGenerator.openAPI.components.schemas.LicensedMember).to.not.have.property('$definitions')
                expect(expected).to.equal('#/components/schemas/LicensedMember')
            });
        });
    });
});
