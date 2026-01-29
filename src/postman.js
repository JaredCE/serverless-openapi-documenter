'use strict';

const PostmanGenerator = require("openapi-to-postmanv2");

const fs = require('fs');

class Postman {
    constructor(output, serverless, logger) {
        this.output = output;
        this.logger = logger;
        this.serverless = serverless;
    }

    create(openAPI) {
        const postmanGeneration = (err, result) => {
            if (err) {
                this.logger.error(
                    `ERROR: An error was thrown when generating the Postman collection`
                );
                throw new this.serverless.classes.Error(err);
            }

            this.logger.success(
                "Postman collection v2 Documentation Successfully Generated"
            );

            try {
                fs.writeFileSync(
                    this.output,
                    JSON.stringify(result.output[0].data)
                );

                this.logger.success(
                    "Postman collection v2 Documentation Successfully Written"
                );
            } catch (err) {
                this.logger.error(
                    `ERROR: An error was thrown whilst writing the Postman collection`
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
}

module.exports = Postman;
