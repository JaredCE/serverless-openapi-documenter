"use strict";

const expect = require("chai").expect;
const sinon = require("sinon");
const fs = require('fs/promises');

const Bruno = require('../../src/bruno');

const validOpenAPI = require("../json/valid-openAPI.json");

describe(`Bruno Collection`, function () {
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
        it(`should generate a Bruno collection`, async function() {
            const stub = sinon.stub(fs, 'writeFile').resolves();

            const bruno = new Bruno('bruno.json', sls, logger);

            const expected = await bruno.create(validOpenAPI);

            expect(stub.callCount).to.equal(1)

            stub.restore()
        });

        it(`should throw an error when writing a Bruno collection fails`, async function() {
            const stub = sinon.stub(fs, 'writeFile').rejects(new Error('Sinon created a rejection'));

            const bruno = new Bruno('bruno.json', sls, logger);

            const expected = await bruno.create(validOpenAPI).catch(err => {
                console.error(err);
            });

            expect(stub.callCount).to.equal(1)

            stub.restore()
        });
    });
});
