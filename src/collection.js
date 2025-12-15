'use strict';

const Bruno = require('./bruno');
const Postman = require('./postman');

class CollectionFactory {
    constructor(outputFile, serverless, logger) {
        this.outputFile = outputFile;
        this.serverless = serverless;
        this.logger = logger;
    }

    createCollection(type) {
        let creator;
        switch (type){
            case 'bruno':
                creator = new Bruno(this.outputFile, this.serverless, this.logger);
            break;

            case 'postman':
                creator = new Postman(this.outputFile, this.serverless, this.logger);
            break;
        }

        return creator;
    }
}

module.exports = CollectionFactory;
