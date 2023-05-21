'use strict'

const fs = require('fs').promises
const path = require('path')
const expect = require('chai').expect

const serverlessMock = require('../helpers/serverless')
const modelsDocument = require('../models/models/models.json')
const DefinitionGenerator = require('../../src/definitionGenerator')

describe('DefinitionGenerator', () => {
    let mockServerless
    const v4 = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);
    beforeEach(function() {
        mockServerless = JSON.parse(JSON.stringify(serverlessMock))
        Object.assign(mockServerless.service.custom.documentation, modelsDocument)
    });

    describe('constructor', () => {
        it('should return a definitionGenerator', function() {
            const expected = new DefinitionGenerator(mockServerless, {})
            expect(expected).to.be.an.instanceOf(DefinitionGenerator)
        });

        it('should default to version 3.0.0 of openAPI when openAPI version is not passed in', function() {
            const serverlessWithoutOpenAPIVersion = JSON.parse(JSON.stringify(mockServerless))
            delete serverlessWithoutOpenAPIVersion.processedInput;
            let expected = new DefinitionGenerator(serverlessWithoutOpenAPIVersion, {})
            expect(expected.version).to.be.equal('3.0.0')

            Object.assign(serverlessWithoutOpenAPIVersion, {processedInput: {}})
            expected = new DefinitionGenerator(serverlessWithoutOpenAPIVersion, {})
            expect(expected.version).to.be.equal('3.0.0')

            serverlessWithoutOpenAPIVersion.processedInput = {
                options: {}
            }
            expected = new DefinitionGenerator(serverlessWithoutOpenAPIVersion, {})
            expect(expected.version).to.be.equal('3.0.0')

            serverlessWithoutOpenAPIVersion.processedInput.options = {
                test: 'abc'
            }

            expected = new DefinitionGenerator(serverlessWithoutOpenAPIVersion, {})
            expect(expected.version).to.be.equal('3.0.0')

            serverlessWithoutOpenAPIVersion.processedInput.options = {
                openApiVersion: null
            }

            expected = new DefinitionGenerator(serverlessWithoutOpenAPIVersion, {})
            expect(expected.version).to.be.equal('3.0.0')

            serverlessWithoutOpenAPIVersion.processedInput.options = {
                openApiVersion: undefined
            }

            expected = new DefinitionGenerator(serverlessWithoutOpenAPIVersion, {})
            expect(expected.version).to.be.equal('3.0.0')

            serverlessWithoutOpenAPIVersion.processedInput.options = {
                openapiVersion: undefined
            }

            expected = new DefinitionGenerator(serverlessWithoutOpenAPIVersion, {})
            expect(expected.version).to.be.equal('3.0.0')
        });

        it('should respect the version of openAPI when passed in', function() {
            const serverlessWithOpenAPIVersion = JSON.parse(JSON.stringify(mockServerless))
            serverlessWithOpenAPIVersion.processedInput.options.openApiVersion = '3.0.2'
            let expected = new DefinitionGenerator(serverlessWithOpenAPIVersion, {})
            expect(expected.version).to.be.equal('3.0.2')

            serverlessWithOpenAPIVersion.processedInput.options.openApiVersion = '3.0.1'
            expected = new DefinitionGenerator(serverlessWithOpenAPIVersion, {})
            expect(expected.version).to.be.equal('3.0.1')
        });
    });

    describe('createInfo', () => {
        it('should create openAPI info object correctly', function() {
            const definitionGenerator = new DefinitionGenerator(mockServerless)
            definitionGenerator.createInfo()

            expect(definitionGenerator.openAPI).to.be.an('object')
            expect(definitionGenerator.openAPI.info).to.be.an('object')
            // expect(definitionGenerator.openAPI.info).to.deep.equal(mockServerless.service.custom.documentation)
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
});
