"use strict";

const expect = require("chai").expect;
const sinon = require("sinon");
const fs = require('fs');

const Postman = require('../../src/postman');

const validOpenAPI = require("../json/valid-openAPI.json");

describe(`Postman Collection`, function () {
    let sls, logger;

    beforeEach(function() {
        sls = {
            service: {
                service: "test-service",
                provider: {
                stage: "test",
                },
                getAllFunctions: () => {},
                getFunction: () => {},
            },
            version: "3.0.0",
            variables: {
                service: {
                custom: {},
                },
            },
            configSchemaHandler: {
                defineFunctionEventProperties: () => {},
                defineFunctionProperties: () => {},
                defineCustomProperties: () => {},
            },
            classes: {
                Error: class ServerlessError {
                constructor(err) {
                    return new Error(err);
                }
                },
            },
            processedInput: {
                options: {
                postmanCollection: "postman.json",
                },
            },
        };

        logger = {
            success: (str) => {
                console.log(str);
            },
            error: (str) => {
                console.error(str);
            },
        };
    });

    describe(`create`, function () {
        it(`should create a Postman collection`, function() {
            const stub = sinon.stub(fs, 'writeFileSync').returns();

            const postman = new Postman('postman.json', sls, logger);

            const expected = postman.create(validOpenAPI);

            expect(stub.callCount).to.equal(1);

            stub.restore();
        });

        it(`should throw an error when writing a Postman collection fails`, function() {
            const stub = sinon.stub(fs, 'writeFileSync').throws(new Error('Sinon threw an error'));

            try {
                const postman = new Postman('postman.json', sls, logger);

                const expected = postman.create(validOpenAPI);
            } catch (err) {
                console.error(err)
            }

            expect(stub.callCount).to.equal(1);

            stub.restore();
        });
    });
});
