"use strict";

const fs = require("fs");
const yaml = require("js-yaml");
const chalk = require("chalk");

const DefinitionGenerator = require("./definitionGenerator");
const Logger = require("./logger");
const PostmanGenerator = require("openapi-to-postmanv2");

class OpenAPIGenerator {
  constructor(serverless, options, { log = {} } = {}) {
    this.logOutput = log;
    this.serverless = serverless;
    this.options = options;
    this.logger = new Logger(this.serverless, this.logOutput);

    this.commands = {
      openapi: {
        commands: {
          generate: {
            lifecycleEvents: ["serverless"],
            usage: "Generate OpenAPI v3 Description",
            options: {
              output: {
                usage: "Output file location [default: openapi.json|yml]",
                shortcut: "o",
                type: "string",
              },
              format: {
                usage: "OpenAPI file format (yml|json) [default: json]",
                shortcut: "f",
                type: "string",
              },
              indent: {
                usage: "File indentation in spaces [default: 2]",
                shortcut: "i",
                type: "string",
              },
              openApiVersion: {
                usage: "OpenAPI version number [default: 3.0.0]",
                shortcut: "a",
                type: "string",
              },
              postmanCollection: {
                usage:
                  "Output a postman collection and attach to OpenApi external documents [default: postman.json if passed]",
                shortcut: "p",
                type: "string",
              },
              validationWarn: {
                usage:
                  "Only warn about validation errors of the OpenAPI Description, write the file if parsing is successful [default: false]",
                shortcut: "w",
                type: "boolean",
              },
            },
          },
        },
      },
    };

    this.hooks = {
      "openapi:generate:serverless": this.generate.bind(this),
    };

    this.customVars = this.serverless.variables.service.custom;

    const functionEventDocumentationSchema = {
      properties: {
        documentation: {
          type: "object",
          properties: {
            methodResponses: {
              type: "array",
            },
          },
          required: ["methodResponses"],
        },
      },
    };

    this.serverless.configSchemaHandler.defineCustomProperties({
      type: "object",
      properties: {
        documentation: {
          type: "object",
        },
      },
      required: ["documentation"],
    });

    this.serverless.configSchemaHandler.defineFunctionEventProperties(
      "aws",
      "http",
      functionEventDocumentationSchema
    );

    this.serverless.configSchemaHandler.defineFunctionEventProperties(
      "aws",
      "httpApi",
      functionEventDocumentationSchema
    );

    this.serverless.configSchemaHandler.defineFunctionProperties("aws", {
      properties: {
        summary: { type: "string" },
        servers: { anyOf: [{ type: "object" }, { type: "array" }] },
      },
    });
  }

  log(str, type = this.defaultLog) {
    switch (this.serverless.version[0]) {
      case "2":
        let colouredString = str;
        if (type === "error") {
          colouredString = chalk.bold.red(`✖ ${str}`);
        } else if (type === "success") {
          colouredString = chalk.bold.green(`✓ ${str}`);
        }

        this.serverless.cli.log(colouredString);
        break;

      case "4":
      case "3":
        this.logOutput[type](str);
        break;

      default:
        process.stdout.write(str.join(" "));
        break;
    }
  }

  async generate() {
    this.logger.notice(
      chalk.bold.underline("OpenAPI v3 Description Generation")
    );
    this.processCliInput();

    const validOpenAPI = await this.generationAndValidation().catch((err) => {
      throw new this.serverless.classes.Error(err);
    });

    if (this.config.postmanCollection) {
      this.createPostman(validOpenAPI);
    }

    let output;
    switch (this.config.format.toLowerCase()) {
      case "json":
        output = JSON.stringify(validOpenAPI, null, this.config.indent);
        break;
      case "yaml":
      default:
        output = yaml.dump(validOpenAPI, { indent: this.config.indent });
        break;
    }
    try {
      fs.writeFileSync(this.config.file, output);
      this.logger.success("OpenAPI v3 Description Successfully Written");
    } catch (err) {
      this.logger.error(
        `ERROR: An error was thrown whilst writing the OpenAPI Description`
      );
      throw new this.serverless.classes.Error(err);
    }
  }

  async generationAndValidation() {
    const generator = new DefinitionGenerator(this.serverless, this.logger);

    this.logger.notice(`Generating OpenAPI Description`);
    await generator.parse().catch((err) => {
      this.logger.error(
        `ERROR: An error was thrown generating the OpenAPI v3 Description`
      );
      throw new this.serverless.classes.Error(err);
    });

    this.logger.notice(`Validating generated OpenAPI Description`);

    const validationResults = await generator.validate().catch((err) => {
      this.logger.error(
        `ERROR: An error was thrown validating the OpenAPI v3 Description`
      );

      throw new this.serverless.classes.Error(err);
    });

    this.validationErrorDetails(validationResults);

    if (validationResults.length && this.config.validationWarn === false) {
      let message = "Error validating OpenAPI Description:\r\n";
      let shouldThrow = false;
      for (const error of validationResults) {
        message += `${error.message}\r\n`;
        if (error.severity === "error") {
          shouldThrow = true;
        }
      }

      if (shouldThrow) throw new this.serverless.classes.Error(message);
    }

    this.logger.success("OpenAPI v3 Description Successfully Generated");

    return generator.openAPI;
  }

  createPostman(openAPI) {
    const postmanGeneration = (err, result) => {
      if (err) {
        this.logger.error(
          `ERROR: An error was thrown when generating the postman collection`
        );
        throw new this.serverless.classes.Error(err);
      }

      this.logger.success(
        "postman collection v2 Documentation Successfully Generated"
      );

      try {
        fs.writeFileSync(
          this.config.postmanCollection,
          JSON.stringify(result.output[0].data)
        );
        this.logger.success(
          "postman collection v2 Documentation Successfully Written"
        );
      } catch (err) {
        this.logger.error(
          `ERROR: An error was thrown whilst writing the postman collection`
        );

        throw new this.serverless.classes.Error(err);
      }
    };

    PostmanGenerator.convert(
      { type: "json", data: structuredClone(openAPI) },
      {},
      postmanGeneration
    );
  }

  processCliInput() {
    const config = {
      format: "json",
      file: "openapi.json",
      indent: 2,
      openApiVersion: "3.0.0",
      postmanCollection: "postman.json",
      validationWarn: false,
    };

    config.indent = this.serverless.processedInput.options.indent || 2;
    config.format = this.serverless.processedInput.options.format || "json";
    config.openApiVersion =
      this.serverless.processedInput.options.openApiVersion || "3.0.0";
    config.postmanCollection =
      this.serverless.processedInput.options.postmanCollection || null;
    config.validationWarn =
      this.serverless.processedInput.options.validationWarn || false;

    if (["yaml", "json"].indexOf(config.format.toLowerCase()) < 0) {
      throw new this.serverless.classes.Error(
        'Invalid Output Format Specified - must be one of "yaml" or "json"'
      );
    }

    config.file =
      this.serverless.processedInput.options.output ||
      (config.format === "yaml" ? "openapi.yml" : "openapi.json");

    this.logger.notice(
      `${chalk.bold.green("[OPTIONS]")}
  openApiVersion: "${chalk.bold.green(String(config.openApiVersion))}"
  format: "${chalk.bold.green(config.format)}"
  output file: "${chalk.bold.green(config.file)}"
  indentation: "${chalk.bold.green(String(config.indent))}"
  validationWarn: ${chalk.bold.green(String(config.validationWarn))}
  ${
    config.postmanCollection
      ? `postman collection: ${chalk.bold.green(config.postmanCollection)}`
      : `\n\n`
  }`
    );

    this.config = config;
  }

  validationErrorDetails(validationErrors) {
    if (validationErrors.length) {
      this.logger.error(
        `${chalk.bold.yellow(
          "[VALIDATION]"
        )} Validation errors found in OpenAPI Description: \n`
      );

      for (const error of validationErrors) {
        this.logger.error(`${chalk.bold.red("Severity:")} ${error.severity}`);
        this.logger.error(`${chalk.bold.yellow("Message:")} ${error.message}`);
        for (const location of error.location) {
          this.logger.error(
            `${chalk.bold.yellow("found at location:")} ${location.pointer}`
          );
        }
      }
    }
  }
}

module.exports = OpenAPIGenerator;
