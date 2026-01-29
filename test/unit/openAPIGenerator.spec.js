"use strict";

const fs = require("fs");
const path = require("path");

const PostmanGenerator = require("openapi-to-postmanv2");
const sinon = require("sinon");
const expect = require("chai").expect;

const validOpenAPI = require("../json/valid-openAPI.json");

const basicDocumentation = require("../models/BasicDocumentation.json");
const basicValidFunction = require("../models/BasicValidFunction.json");

const OpenAPIGenerator = require("../../src/openAPIGenerator");

describe("OpenAPIGenerator", () => {
  let sls, logOutput;

  beforeEach(function () {
    sls = {
      service: {
        service: "test-service",
        provider: {
          stage: "test",
        },
        getAllFunctions: () => { },
        getFunction: () => { },
      },
      version: "3.0.0",
      variables: {
        service: {
          custom: {},
        },
      },
      configSchemaHandler: {
        defineFunctionEventProperties: () => { },
        defineFunctionProperties: () => { },
        defineCustomProperties: () => { },
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

    logOutput = {
      log: {
        notice: (str) => { },
        error: (str) => { },
        success: (str) => { },
        verbose: (str) => { },
      },
    };
  });

  after(function () {
    delete require
      .cache[require.resolve(`${path.resolve("options")}/redocly.json`)];
  });

  describe("generationAndValidation", () => {
    it("should correctly generate a valid OpenAPI document", async function () {
      const succSpy = sinon.spy(logOutput.log, "success");
      const errSpy = sinon.spy(logOutput.log, "error");

      Object.assign(sls.service, basicDocumentation);
      const getAllFuncsStub = sinon
        .stub(sls.service, "getAllFunctions")
        .returns(["createUser"]);

      const getFuncStub = sinon
        .stub(sls.service, "getFunction")
        .returns(basicValidFunction.createUser);

      const openAPIGenerator = new OpenAPIGenerator(sls, {}, logOutput);
      openAPIGenerator.processCliInput();

      const validOpenAPIDocument = await openAPIGenerator
        .generationAndValidation()
        .catch((err) => {
          expect(err).to.be.undefined;
        });

      expect(succSpy.called).to.be.true;
      expect(errSpy.called).to.be.false;

      succSpy.restore();
      errSpy.restore();
      getAllFuncsStub.reset();
      getFuncStub.reset();
    });

    xit("should throw an error when trying to generate an invalid OpenAPI document", async function () {
      const succSpy = sinon.spy(logOutput.log, "success");
      const errSpy = sinon.spy(logOutput.log, "error");

      Object.assign(sls.service, basicDocumentation);
      const getAllFuncsStub = sinon
        .stub(sls.service, "getAllFunctions")
        .returns(["createUser"]);
      const basicInvalidFunction = structuredClone(basicValidFunction);

      delete basicInvalidFunction.createUser.events[0].http.documentation
        .methodResponses[0].responseModels;
      const getFuncStub = sinon
        .stub(sls.service, "getFunction")
        .returns(basicInvalidFunction.createUser);

      const openAPIGenerator = new OpenAPIGenerator(sls, {}, logOutput);
      openAPIGenerator.processCliInput();

      const validOpenAPIDocument = await openAPIGenerator
        .generationAndValidation()
        .catch((err) => {
          expect(err.message).to.be.equal(
            "Error: createUser is missing a Response Model for statusCode 200"
          );
        });

      expect(succSpy.called).to.be.false;
      expect(errSpy.called).to.be.true;

      succSpy.restore();
      errSpy.restore();
      getAllFuncsStub.reset();
      getFuncStub.reset();
    });

    it("should correctly validate a valid OpenAPI document", async function () {
      const succSpy = sinon.spy(logOutput.log, "success");
      const errSpy = sinon.spy(logOutput.log, "error");

      Object.assign(sls.service, basicDocumentation);
      const getAllFuncsStub = sinon
        .stub(sls.service, "getAllFunctions")
        .returns(["createUser"]);
      const basicInvalidFunction = structuredClone(basicValidFunction);

      const getFuncStub = sinon
        .stub(sls.service, "getFunction")
        .returns(basicInvalidFunction.createUser);

      const openAPIGenerator = new OpenAPIGenerator(sls, {}, logOutput);
      openAPIGenerator.processCliInput();

      const validOpenAPIDocument = await openAPIGenerator
        .generationAndValidation()
        .catch((err) => {
          expect(err).to.be.undefined;
        });

      expect(succSpy.called).to.be.true;
      expect(errSpy.called).to.be.false;
      expect(validOpenAPIDocument).to.have.property("openapi");

      succSpy.restore();
      errSpy.restore();
      getAllFuncsStub.reset();
      getFuncStub.reset();
    });

    it("should throw an error when trying to validate an invalid OpenAPI document", async function () {
      const succSpy = sinon.spy(logOutput.log, "success");
      const errSpy = sinon.spy(logOutput.log, "error");

      Object.assign(sls.service, basicDocumentation);

      const getAllFuncsStub = sinon
        .stub(sls.service, "getAllFunctions")
        .returns(["createUser"]);

      const basicInvalidFunction = structuredClone(basicValidFunction);

      delete basicInvalidFunction.createUser.events[0].http.documentation
        .pathParams;
      const getFuncStub = sinon
        .stub(sls.service, "getFunction")
        .returns(basicInvalidFunction.createUser);

      const openAPIGenerator = new OpenAPIGenerator(sls, {}, logOutput);
      openAPIGenerator.processCliInput();

      const validOpenAPIDocument = await openAPIGenerator
        .generationAndValidation()
        .catch((err) => {
          // expect(err.message).to.be.equal(
          //   `Error validating OpenAPI Description:\r\nThe operation does not define the path parameter \`{name}\` expected by path \`/find/{name}\`.`
          // );
          expect(err).to.have.property("message");
          expect(err.message).to.include(
            "Error validating OpenAPI Description:"
          );
        });

      expect(succSpy.called).to.be.false;
      expect(errSpy.called).to.be.true;

      succSpy.restore();
      errSpy.restore();
      getAllFuncsStub.reset();
      getFuncStub.reset();
    });
  });
});
