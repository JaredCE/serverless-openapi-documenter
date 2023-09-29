"use strict";

const fs = require("fs");
const yaml = require("js-yaml");
const chalk = require("chalk");

const DefinitionGenerator = require("./definitionGenerator");
const PostmanGenerator = require("openapi-to-postmanv2");

class OpenAPIGenerator {
  constructor(serverless, options, { log = {} } = {}) {
    this.logOutput = log;
    this.serverless = serverless;
    this.options = options;

    this.logTypes = {
      NOTICE: "notice",
      DEBUG: "debug",
      ERROR: "error",
      WARNING: "warning",
      INFO: "info",
      VERBOSE: "verbose",
      SUCCESS: "success",
    };

    this.defaultLog = this.logTypes.NOTICE;

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

      case "3":
        this.logOutput[type](str);
        break;

      default:
        process.stdout.write(str.join(" "));
        break;
    }
  }

  async generate() {
    this.log(chalk.bold.underline("OpenAPI v3 Description Generation"));
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
      this.log(
        "OpenAPI v3 Description Successfully Written",
        this.logTypes.SUCCESS
      );
    } catch (err) {
      this.log(
        `ERROR: An error was thrown whilst writing the OpenAPI Description`,
        this.logTypes.ERROR
      );
      throw new this.serverless.classes.Error(err);
    }
  }

  async generationAndValidation() {
    const generator = new DefinitionGenerator(this.serverless);

    this.log(`Generating OpenAPI Description`, this.logTypes.NOTICE);
    await generator.parse().catch((err) => {
      this.log(
        `ERROR: An error was thrown generating the OpenAPI v3 Description`,
        this.logTypes.ERROR
      );
      throw new this.serverless.classes.Error(err);
    });

    this.log(`Validating generated OpenAPI Description`, this.logTypes.NOTICE);

    await generator.validate().catch((err) => {
      this.log(
        `ERROR: An error was thrown validating the OpenAPI v3 Description`,
        this.logTypes.ERROR
      );

      this.validationErrorDetails(err);

      if (this.config.validationWarn === false) {
        let message = "Error validating OpenAPI Description:\r\n";
        for (const errorMessage of err) {
          message += `${errorMessage.message}\r\n`;
        }

        throw new this.serverless.classes.Error(message);
      }
    });

    this.log(
      "OpenAPI v3 Description Successfully Generated",
      this.logTypes.SUCCESS
    );

    return generator.openAPI;
  }

  createPostman(openAPI) {
    const postmanGeneration = (err, result) => {
      if (err) {
        this.log(
          `ERROR: An error was thrown when generating the postman collection`,
          this.logTypes.ERROR
        );
        throw new this.serverless.classes.Error(err);
      }

      this.log(
        "postman collection v2 Documentation Successfully Generated",
        this.logTypes.SUCCESS
      );
      try {
        fs.writeFileSync(
          this.config.postmanCollection,
          JSON.stringify(result.output[0].data)
        );
        this.log(
          "postman collection v2 Documentation Successfully Written",
          this.logTypes.SUCCESS
        );
      } catch (err) {
        this.log(
          `ERROR: An error was thrown whilst writing the postman collection`,
          this.logTypes.ERROR
        );
        throw new this.serverless.classes.Error(err);
      }
    };

    PostmanGenerator.convert(
      { type: "json", data: JSON.parse(JSON.stringify(openAPI)) },
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

    this.log(
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

  validationErrorDetails(validationError) {
    this.log(
      `${chalk.bold.yellow(
        "[VALIDATION]"
      )} Validation errors found in OpenAPI Description: \n`,
      this.logTypes.ERROR
    );

    for (const error of validationError) {
      this.log(
        `${chalk.bold.yellow("Message:")} ${error.message}`,
        this.logTypes.ERROR
      );
      for (const location of error.location) {
        this.log(
          `${chalk.bold.yellow("found at location:")} ${location.pointer}`,
          this.logTypes.ERROR
        );
      }
    }
  }
}

module.exports = OpenAPIGenerator;
