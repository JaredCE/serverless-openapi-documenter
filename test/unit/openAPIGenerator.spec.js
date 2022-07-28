'use strict'

const fs = require('fs')
const PostmanGenerator = require('openapi-to-postmanv2')
const sinon = require('sinon')
const expect = require('chai').expect

const validOpenAPI = require('../json/valid-openAPI.json')

const OpenAPIGenerator = require('../../src/openAPIGenerator')

describe('OpenAPIGenerator', () => {
    let sls, logOutput
    beforeEach(function() {
        sls = {
            version: '3.0.0',
            variables: {
                service: {
                    custom: {

                    }
                }
            },
            configSchemaHandler: {
                defineFunctionEventProperties: () => {},
                defineFunctionProperties: () => {}
            },
            classes: {
                Error: class ServerlessError {constructor(err) {return new Error(err)}}
            },
            processedInput: {
                options: {
                    postmanCollection: 'postman.json'
                }
            }
        }

        logOutput = {
            log: {
                notice: (str) => {},
                error: (str) => {},
                success: (str) => {}
            }
        }
    });
    describe('createPostman', () => {
        it('should generate a postman collection when a valid openAPI file is generated', function() {
            const fsStub = sinon.stub(fs, 'writeFileSync').returns(true)
            const succSpy = sinon.spy(logOutput.log, 'success')
            const errSpy = sinon.spy(logOutput.log, 'error')
            const openAPIGenerator = new OpenAPIGenerator(sls, {}, logOutput)
            openAPIGenerator.processCliInput()

            openAPIGenerator.createPostman(validOpenAPI)

            expect(fsStub.called).to.be.true
            expect(succSpy.calledTwice).to.be.true
            expect(errSpy.called).to.be.false
            fsStub.restore()
            succSpy.restore()
            errSpy.restore()
        });

        it('should throw an error when writing a file fails', function() {
            const errStub = sinon.stub(logOutput.log, 'error').returns('')
            const succSpy = sinon.spy(logOutput.log, 'success')
            const fsStub = sinon.stub(fs, 'writeFileSync').throws(new Error())
            const openAPIGenerator = new OpenAPIGenerator(sls, {}, logOutput)
            openAPIGenerator.processCliInput()

            expect(() => {openAPIGenerator.createPostman(validOpenAPI)}).to.throw()

            expect(fsStub.called).to.be.true
            expect(errStub.called).to.be.true
            expect(succSpy.calledOnce).to.be.true
            expect(succSpy.calledTwice).to.be.false
            fsStub.restore()
            succSpy.restore()
            errStub.restore()
        });

        it('should throw an error converting an OpenAPI fails', function() {
            const errStub = sinon.spy(logOutput.log, 'error')
            const succSpy = sinon.spy(logOutput.log, 'success')
            const pgStub = sinon.stub(PostmanGenerator, 'convert')
            pgStub.yields(new Error())

            const openAPIGenerator = new OpenAPIGenerator(sls, {}, logOutput)
            openAPIGenerator.processCliInput()

            expect(() => {openAPIGenerator.createPostman(validOpenAPI)}).to.throw()

            expect(errStub.called).to.be.true
            expect(succSpy.calledOnce).to.be.false
            expect(succSpy.calledTwice).to.be.false

            succSpy.restore()
            errStub.restore()
        });
    });
});
