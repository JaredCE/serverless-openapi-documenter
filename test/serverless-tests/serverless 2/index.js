const openApi = {
    openapi: '3.0.0',
    info: {
      title: 'serverless-openapi-doc-demo',
      description: 'This is a description of what this does',
      version: '1.0.0'
    },
    components: {
    //   requestBodies: {

    //   },
      responses: {
        PutDocumentResponse: {
          description: 'PUT Document response model (external reference example)',
          content: {
            'application/json': { schema: { title: 'Empty Schema', type: 'object' } }
          }
        },
        // ErrorResponse: {
        //   description: 'This is an error',
        //   content: {
        //     'application/json': {
        //       schema: {
        //         title: 'JSON API Schema',
        //         description: 'This is a schema for responses in the JSON API format. For more, see http://jsonapi.org',
        //         type: 'object',
        //         required: [ 'errors' ],
        //         properties: {
        //           errors: {
        //             type: 'array',
        //             items: { '$ref': '#/components/schemas/error' },
        //             uniqueItems: true
        //           },
        //           meta: { '$ref': '#/components/schemas/meta' },
        //           links: { '$ref': '#/components/schemas/links' }
        //         },
        //         additionalProperties: false
        //       }
        //     }
        //   }
        // }
      },
      schemas: {
        PutDocumentRequest: {
            // description: 'PUT Document request model (inline example)',
            // content: {
            //     'application/json': {
                // schema: {
                    properties: {
                    SomeObject: {
                        type: 'object',
                        properties: { SomeAttribute: { type: 'string' } }
                    }
                    }
                // }
            //     }
            // }
        },
        error: {
          type: 'object',
          properties: {
            id: {
              description: 'A unique identifier for this particular occurrence of the problem.',
              type: 'string'
            },
            links: { '$ref': '#/components/schemas/links' },
            status: {
              description: 'The HTTP status code applicable to this problem, expressed as a string value.',
              type: 'string'
            },
            code: {
              description: 'An application-specific error code, expressed as a string value.',
              type: 'string'
            },
            title: {
              description: 'A short, human-readable summary of the problem. It **SHOULD NOT** change from occurrence to occurrence of the problem, except for purposes of localization.',
              type: 'string'
            },
            detail: {
              description: 'A human-readable explanation specific to this occurrence of the problem.',
              type: 'string'
            },
            source: {
              type: 'object',
              properties: {
                pointer: {
                  description: 'A JSON Pointer [RFC6901] to the associated entity in the request document [e.g. "/data" for a primary data object, or "/data/attributes/title" for a specific attribute].',
                  type: 'string'
                },
                parameter: {
                  description: 'A string indicating which query parameter caused the error.',
                  type: 'string'
                }
              }
            },
            meta: { '$ref': '#/components/schemas/meta' }
          },
          additionalProperties: false
        },
        meta: {
          description: 'Non-standard meta-information that can not be represented as an attribute or relationship.',
          type: 'object',
          additionalProperties: true
        },
        links: {
          description: `A resource object **MAY** contain references to other resource objects ("relationships"). Relationships may be to-one or to-many. Relationships can be specified by including a member in a resource's links object.`,
          type: 'object',
          properties: {
            self: {
              description: 'A `self` member, whose value is a URL for the relationship itself (a "relationship URL"). This URL allows the client to directly manipulate the relationship. For example, it would allow a client to remove an `author` from an `article` without deleting the people resource itself.',
              type: 'string',
              format: 'uri'
            },
            related: { '$ref': '#/components/schemas/link' }
          },
          additionalProperties: true
        },
        link: {
          description: "A link **MUST** be represented as either: a string containing the link's URL or a link object.",
          oneOf: [
            {
              description: "A string containing the link's URL.",
              type: 'string',
              format: 'uri'
            },
            {
              type: 'object',
              required: [ 'href' ],
              properties: {
                href: {
                  description: "A string containing the link's URL.",
                  type: 'string',
                  format: 'uri'
                },
                meta: { '$ref': '#/components/schemas/meta' }
              }
            }
          ]
        }
      }
    },
    paths: {
      '/create/{username}': {
        post: {
          summary: 'Create User',
          description: 'Creates a user and then sends a generated password email',
          operationId: 'a8a77f9b-da84-48c3-9265-5dce491d4749',
          parameters: [
            {
              name: 'username',
              in: 'path',
              description: 'The username for a user to create',
              required: true,
              schema: { type: 'string', pattern: '^[-a-z0-9_]+$' }
            },
            {
              name: 'membershipType',
              in: 'query',
              description: "The user's Membership Type",
              required: false,
              schema: { type: 'string', enum: [ 'premium', 'standard' ] }
            },
            {
              name: 'SessionId',
              in: 'cookie',
              description: 'A Session ID variable',
              required: false,
              schema: { type: 'string' }
            }
          ],
          requestBody: {
            description: 'A user information object',
            required: false,
            // schema: {
            //     '$ref': '#/components/requestBodies/PutDocumentRequest'
            // }
            content: {
              'application/json': {
                schema: {
                  '$ref': '#/components/schemas/PutDocumentRequest'
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'A user object along with generated API Keys',
            //   content: {
            //     'application/json': {
            //       schema: {
            //         '$ref': '#/components/responses/PutDocumentResponse'
            //       }
            //     }
            //   }
        //     },
        //     '500': {
        //       description: 'An error message when creating a new user',
        //       content: {
        //         'application/json': {
        //           schema: { '$ref': '#/components/responses/ErrorResponse' }
        //         }
        //       }
            }
          }
        }
      }
    }
  }


const validator = require('oas-validator');
const main = async () => {
    await validator.validateInner(openApi, {})
        .catch(err => {
            console.error(err)
        })
}

main()

