"use strict";

module.exports = {
  processedInput: {
    options: {
      openApiVersion: "3.0.1",
    },
  },
  service: {
    service: "myAPI",
    custom: {
      documentation: {
        title: "My new API",
        description: "This API does things",
        version: "0.0.1",
        basePath: "v1",
        paths: {
          "/test/path": {
            post: {
              tags: ["Ttest Api"],
              summary: "Test Api",
              parameters: [
                {
                  in: "path",
                  name: "id",
                  required: true,
                  schema: {
                    type: "string",
                  },
                },
              ],
              responses: {
                204: {
                  description: "No content",
                },
              },
            },
          },
        },
      },
    },
  },
};
