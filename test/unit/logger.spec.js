"use strict";

const expect = require("chai").expect;
const sinon = require("sinon");

const Logger = require("../../src/logger");

describe(`Logger`, function () {
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
        debug: (str) => {},
        error: (str) => {},
        info: (str) => {},
        notice: (str) => {},
        success: (str) => {},
        verbose: (str) => {},
        warning: (str) => {},
      },
    };
  });

  describe(`debug`, function () {
    it(`should log a debug log type when debug is called`, function () {
      const logger = new Logger(sls, logOutput.log);
      const spy = sinon.spy(logger, "log");

      logger.debug("Testing");

      expect(spy.called).to.be.true;

      spy.restore();
    });
  });

  describe(`error`, function () {
    it(`should log a error log type when error is called`, function () {
      const logger = new Logger(sls, logOutput.log);
      const spy = sinon.spy(logger, "log");

      logger.error("Testing");

      expect(spy.called).to.be.true;

      spy.restore();
    });
  });

  describe(`info`, function () {
    it(`should log a info log type when info is called`, function () {
      const logger = new Logger(sls, logOutput.log);
      const spy = sinon.spy(logger, "log");

      logger.info("Testing");

      expect(spy.called).to.be.true;

      spy.restore();
    });
  });

  describe(`notice`, function () {
    it(`should log a notice log type when log is called without a log type`, function () {
      const logger = new Logger(sls, logOutput.log);
      const spy = sinon.spy(logger, "log");

      logger.log("Testing");

      expect(spy.called).to.be.true;

      spy.restore();
    });

    it(`should log a notice log type when notice is called`, function () {
      const logger = new Logger(sls, logOutput.log);
      const spy = sinon.spy(logger, "log");

      logger.notice("Testing");

      expect(spy.called).to.be.true;

      spy.restore();
    });
  });

  describe(`success`, function () {
    it(`should log a success log type when success is called`, function () {
      const logger = new Logger(sls, logOutput.log);
      const spy = sinon.spy(logger, "log");

      logger.success("Testing");

      expect(spy.called).to.be.true;

      spy.restore();
    });
  });

  describe(`verbose`, function () {
    it(`should log a verbose log type when verbose is called`, function () {
      const logger = new Logger(sls, logOutput.log);
      const spy = sinon.spy(logger, "log");

      logger.verbose("Testing");

      expect(spy.called).to.be.true;

      spy.restore();
    });
  });

  describe(`warning`, function () {
    it(`should log a warning log type when warning is called`, function () {
      const logger = new Logger(sls, logOutput.log);
      const spy = sinon.spy(logger, "log");

      logger.warning("Testing");

      expect(spy.called).to.be.true;

      spy.restore();
    });
  });
});
