"use strict";

class Logger {
  constructor(serverless, log) {
    this.serverless = serverless;
    this.logOutput = log;

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

  debug(str) {
    this.log(str, this.logTypes.DEBUG);
  }

  error(str) {
    this.log(str, this.logTypes.ERROR);
  }

  info(str) {
    this.log(str, this.logTypes.INFO);
  }

  notice(str) {
    this.log(str, this.logTypes.NOTICE);
  }

  success(str) {
    this.log(str, this.logTypes.SUCCESS);
  }

  verbose(str) {
    this.log(str, this.logTypes.VERBOSE);
  }

  warning(str) {
    this.log(str, this.logTypes.WARNING);
  }
}

module.exports = Logger;
