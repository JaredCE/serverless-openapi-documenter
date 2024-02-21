"use strict";

const fs = require("fs");
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

    logOutput = {
      log: {
        notice: (str) => {},
        error: (str) => {},
        success: (str) => {},
      },
    };
  });

  describe("generationAndValidation", () => {
    it("should correctly generate a valid openAPI document", async function () {
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

    xit("should throw an error when trying to generate an invalid openAPI document", async function () {
      const succSpy = sinon.spy(logOutput.log, "success");
      const errSpy = sinon.spy(logOutput.log, "error");

      Object.assign(sls.service, basicDocumentation);
      const getAllFuncsStub = sinon
        .stub(sls.service, "getAllFunctions")
        .returns(["createUser"]);
      const basicInvalidFunction = JSON.parse(
        JSON.stringify(basicValidFunction)
      );

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

    it("should correctly validate a valid openAPI document", async function () {
      const succSpy = sinon.spy(logOutput.log, "success");
      const errSpy = sinon.spy(logOutput.log, "error");

      Object.assign(sls.service, basicDocumentation);
      const getAllFuncsStub = sinon
        .stub(sls.service, "getAllFunctions")
        .returns(["createUser"]);
      const basicInvalidFunction = JSON.parse(
        JSON.stringify(basicValidFunction)
      );

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

    it("should throw an error when trying to validate an invalid openAPI document", async function () {
      const succSpy = sinon.spy(logOutput.log, "success");
      const errSpy = sinon.spy(logOutput.log, "error");

      Object.assign(sls.service, basicDocumentation);
      const getAllFuncsStub = sinon
        .stub(sls.service, "getAllFunctions")
        .returns(["createUser"]);
      const basicInvalidFunction = JSON.parse(
        JSON.stringify(basicValidFunction)
      );

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

  describe("createPostman", () => {
    it("should generate a postman collection when a valid openAPI file is generated", function () {
      const fsStub = sinon.stub(fs, "writeFileSync").returns(true);
      const succSpy = sinon.spy(logOutput.log, "success");
      const errSpy = sinon.spy(logOutput.log, "error");
      const openAPIGenerator = new OpenAPIGenerator(sls, {}, logOutput);
      openAPIGenerator.processCliInput();

      openAPIGenerator.createPostman(validOpenAPI);

      expect(fsStub.called).to.be.true;
      expect(succSpy.calledTwice).to.be.true;
      expect(errSpy.called).to.be.false;
      fsStub.restore();
      succSpy.restore();
      errSpy.restore();
    });

    it("should throw an error when writing a file fails", function () {
      const errStub = sinon.stub(logOutput.log, "error").returns("");
      const succSpy = sinon.spy(logOutput.log, "success");
      const fsStub = sinon.stub(fs, "writeFileSync").throws(new Error());
      const openAPIGenerator = new OpenAPIGenerator(sls, {}, logOutput);
      openAPIGenerator.processCliInput();

      expect(() => {
        openAPIGenerator.createPostman(validOpenAPI);
      }).to.throw();

      expect(fsStub.called).to.be.true;
      expect(errStub.called).to.be.true;
      expect(succSpy.calledOnce).to.be.true;
      expect(succSpy.calledTwice).to.be.false;
      fsStub.restore();
      succSpy.restore();
      errStub.restore();
    });

    it("should throw an error converting an OpenAPI fails", function () {
      const errStub = sinon.spy(logOutput.log, "error");
      const succSpy = sinon.spy(logOutput.log, "success");
      const pgStub = sinon.stub(PostmanGenerator, "convert");
      pgStub.yields(new Error());

      const openAPIGenerator = new OpenAPIGenerator(sls, {}, logOutput);
      openAPIGenerator.processCliInput();

      expect(() => {
        openAPIGenerator.createPostman(validOpenAPI);
      }).to.throw();

      expect(errStub.called).to.be.true;
      expect(succSpy.calledOnce).to.be.false;
      expect(succSpy.calledTwice).to.be.false;

      succSpy.restore();
      errStub.restore();
    });
  });
});
