'use strict';

const { openApiToBruno } = require('@usebruno/converters');

const fs = require('fs/promises')

class Bruno {
    constructor(output, serverless, logger) {
        this.output = output;
        this.logger = logger;
        this.serverless = serverless;
    }

    async create(openAPI) {
        try {
            const brunoCollection = openApiToBruno(openAPI);

            await fs.writeFile(this.output, JSON.stringify(brunoCollection, null, 2));
            this.logger.success(
                "Bruno collection Documentation Successfully Written"
            );
        } catch (error) {
            this.logger.error(
                `ERROR: An error was thrown whilst writing the Bruno collection`
            );

            throw new this.serverless.classes.Error(error);
        }
    }
}

module.exports = Bruno;
