"use strict";

const expect = require("chai").expect;
const sinon = require("sinon");

const Collection = require('../../src/collection');
const Bruno = require('../../src/bruno');
const Postman = require('../../src/postman');

describe(`Collection`, function () {
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

    describe(`Bruno Collection`, function () {
        it(`should generate a Bruno convertor`, function() {
            const collection = new Collection('bruno.json', sls, logger);

            const expected = collection.createCollection('bruno')

            expect(expected).to.be.instanceOf(Bruno);
        });
    });

    describe(`Postman Collection`, function () {
        it(`should generate a Postman convertor`, function() {
            const collection = new Collection('postman.json', sls, logger)

            const expected = collection.createCollection('postman')

            expect(expected).to.be.instanceOf(Postman);
        });
    });
});
