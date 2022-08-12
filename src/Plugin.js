'use strict'

const fs = require('fs')
const yaml = require('js-yaml');
const chalk = require('chalk')

// const DefinitionGenerator = require('./definitionGenerator')
const OpenAPIGenerator = require('./OpenAPIGenerator')
const PostmanGenerator = require('openapi-to-postmanv2')

class Plugin {
    constructor(serverless, options, {log = {}} = {}) {
        this.logOutput = log;
        this.serverless = serverless
        this.options = options
        this.defaultLog = 'notice';
        this.commands = {
          openapi: {
            commands: {
              generate: {
                lifecycleEvents: [
                  'serverless',
                ],
                usage: 'Generate OpenAPI v3 Documentation',
                options: {
                  output: {
                    usage: 'Output file location [default: openapi.json|yml]',
                    shortcut: 'o',
                    type: 'string',
                  },
                  format: {
                    usage: 'OpenAPI file format (yml|json) [default: json]',
                    shortcut: 'f',
                    type: 'string',
                  },
                  indent: {
                    usage: 'File indentation in spaces [default: 2]',
                    shortcut: 'i',
                    type: 'string',
                  },
                  openApiVersion: {
                    usage: 'OpenAPI version number [default 3.0.0]',
                    shortcut: 'a',
                    type: 'string'
                  },
                  postmanCollection: {
                    usage: 'Output a postman collection and attach to openApi external documents [default: postman.json if passed]',
                    shortcut: 'p',
                    type: 'string'
                  }
                },
              },
            },
          },
        }

        this.hooks = {
          'openapi:generate:serverless': this.generate.bind(this),
        };

        this.customVars = this.serverless.variables.service.custom;

        this.serverless.configSchemaHandler.defineFunctionEventProperties('aws', 'http', {
          properties: {
            documentation: { type: 'object' },
          },
          required: ['documentation'],
        });

        this.serverless.configSchemaHandler.defineFunctionEventProperties('aws', 'httpApi', {
          properties: {
            documentation: { type: 'object' },
          },
          required: ['documentation'],
        });

        this.serverless.configSchemaHandler.defineFunctionProperties('aws', {
          properties: {
            summary: {type: 'string'},
            servers: {anyOf: [{type:'object'}, {type:'array'}]},
          }
        })
    }

    log(type = this.defaultLog, str) {
        switch(this.serverless.version[0]) {
          case '2':
            let colouredString = str
            if (type === 'error') {
              colouredString = chalk.bold.red(`✖ ${str}`)
            } else if (type === 'success') {
              colouredString = chalk.bold.green(`✓ ${str}`)
            }

            this.serverless.cli.log(colouredString)
            break

          case '3':
            this.logOutput[type](str)
            break

          default:
            process.stdout.write(str.join(' '))
            break
        }
    }

    async generate() {
        this.log(this.defaultLog, chalk.bold.underline('OpenAPI v3 Document Generation'))
        const config = this.processCliInput()
        // const generator = new DefinitionGenerator(this.serverless);
        const generator = new OpenAPIGenerator(this.serverless);

        // await generator.parse()
        //   .catch(err => {
        //     this.log('error', `ERROR: An error was thrown generating the OpenAPI v3 documentation`)
        //     throw new this.serverless.classes.Error(err)
        //   })

        await generator.parse()
        console.dir(generator.openAPI, {depth: null})
        // return
        const valid = await generator.validate()
          .catch(err => {
            this.log('error', `ERROR: An error was thrown validating the OpenAPI v3 documentation`)
            console.log(err)
            throw new this.serverless.classes.Error(err)
          })
        // console.log(valid)
        console.dir(generator.openAPI, {depth: null})
        return
        if (valid)
          this.log('success', 'OpenAPI v3 Documentation Successfully Generated')

        if (config.postmanCollection) {
          const postmanGeneration = (err, result) => {
            if (err) {
              this.log('error', `ERROR: An error was thrown when generating the postman collection`)
              throw new this.serverless.classes.Error(err)
            }

            this.log('success', 'postman collection v2 Documentation Successfully Generated')
            try {
              fs.writeFileSync(config.postmanCollection, JSON.stringify(result.output[0].data))
              this.log('success', 'postman collection v2 Documentation Successfully Written')
            } catch (err) {
              this.log('error', `ERROR: An error was thrown whilst writing the postman collection`)
              throw new this.serverless.classes.Error(err)
            }
          }

          const postmanCollection = PostmanGenerator.convert(
            {type: 'json', data: JSON.parse(JSON.stringify(generator.openAPI))},
            {},
            postmanGeneration
          )
        }

        let output
        switch (config.format.toLowerCase()) {
          case 'json':
            output = JSON.stringify(generator.openAPI, null, config.indent);
            break;
          case 'yaml':
          default:
            output = yaml.dump(generator.openAPI, { indent: config.indent });
            break;
        }
        try {
          fs.writeFileSync(config.file, output);
          this.log('success', 'OpenAPI v3 Documentation Successfully Written')
        } catch (err) {
          this.log('error', `ERROR: An error was thrown whilst writing the openAPI Documentation`)
          throw new this.serverless.classes.Error(err)
        }
    }

    processCliInput () {
      const config = {
        format: 'json',
        file: 'openapi.json',
        indent: 2,
        openApiVersion: '3.0.0',
        postmanCollection: 'postman.json'
      };

      config.indent = this.serverless.processedInput.options.indent || 2;
      config.format = this.serverless.processedInput.options.format || 'json';
      config.openApiVersion = this.serverless.processedInput.options.openApiVersion || '3.0.0';
      config.postmanCollection = this.serverless.processedInput.options.postmanCollection || null

      if (['yaml', 'json'].indexOf(config.format.toLowerCase()) < 0) {
        // throw new Error('Invalid Output Format Specified - must be one of "yaml" or "json"');
        throw new this.serverless.classes.Error('Invalid Output Format Specified - must be one of "yaml" or "json"')
      }

      config.file = this.serverless.processedInput.options.output ||
        ((config.format === 'yaml') ? 'openapi.yml' : 'openapi.json');

      this.log(
        this.defaultLog,
        `${chalk.bold.green('[OPTIONS]')}
  openApiVersion: "${chalk.bold.green(String(config.openApiVersion))}"
  format: "${chalk.bold.green(config.format)}"
  output file: "${chalk.bold.green(config.file)}"
  indentation: "${chalk.bold.green(String(config.indent))}"
  ${config.postmanCollection ? `postman collection: ${chalk.bold.green(config.postmanCollection)}`: `\n\n`}`
      )

      return config
    }

    validateDetails(validation) {
      if (validation.valid) {
        this.log(this.defaultLog, `${ chalk.bold.green('[VALIDATION]') } OpenAPI valid: ${chalk.bold.green('true')}\n\n`);
      } else {
        this.log(this.defaultLog, `${chalk.bold.red('[VALIDATION]')} Failed to validate OpenAPI document: \n\n`);
        this.log(this.defaultLog, `${chalk.bold.green('Context:')} ${JSON.stringify(validation.context, null, 2)}\n`);
        this.log(this.defaultLog, `${chalk.bold.green('Error Message:')} ${JSON.stringify(validation.error, null, 2)}\n`);
        if (typeof validation.error === 'string') {
          this.log(this.defaultLog, `${validation.error}\n\n`);
        } else {
          for (const info of validation.error) {
            this.log(this.defaultLog, chalk.grey('\n\n--------\n\n'));
            this.log(this.defaultLog, ' ', chalk.blue(info.dataPath), '\n');
            this.log(this.defaultLog, ' ', info.schemaPath, chalk.bold.yellow(info.message));
            this.log(this.defaultLog, chalk.grey('\n\n--------\n\n'));
            this.log(this.defaultLog, `${inspect(info, { colors: true, depth: 2 })}\n\n`);
          }
        }
      }
    }
}

module.exports = Plugin
