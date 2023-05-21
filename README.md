# OpenAPI Generator for serverless

<p>
  <a href="https://www.serverless.com">
    <img src="http://public.serverless.com/badges/v3.svg">
  </a>
  <a href="https://www.npmjs.com/package/serverless-openapi-documenter">
    <img src="https://img.shields.io/npm/v/serverless-openapi-documenter.svg?style=flat-square">
  </a>
  <a href="https://github.com/JaredCE/serverless-openapi-documenter/actions/workflows/node.yml">
    <img src="https://github.com/JaredCE/serverless-openapi-documenter/actions/workflows/node.yml/badge.svg">
  </a>
</p>



This will generate an OpenAPI V3 (up to v3.0.3) file for you from your serverless file.  It can optionally generate a [Postman Collection V2](https://github.com/postmanlabs/openapi-to-postman) from the OpenAPI file for you too.

Originally based off of: https://github.com/temando/serverless-openapi-documentation

## Install

This plugin works for Serverless 2.x and up and only supports node.js 14 and up.

To add this plugin to your package.json:

**Using npm:**
```bash
npm install --save-dev serverless-openapi-documenter
```

Next you need to add the plugin to the `plugins` section of your `serverless.yml` file.

```yml
plugins:
  - serverless-openapi-documenter
```

> Note: Add this plugin _after_ `serverless-offline` to prevent issues with `String.replaceAll` being overridden incorrectly.

## Adding documentation to serverless

To Run: `serverless openapi generate -o openapi.json -f json -a 3.0.3 -p postman.json`

Options:

```
--output                -o  What filename the OpenAPI documentation should output under. Default: openapi.json
--format                -f  Whether to output the OpenAPI documentation as json or yaml. Default: json
--indent                -i  File indentation in spaces. Default: 2
--openApiVersion        -a  OpenAPI version to generate for. Default: 3.0.0
--postmanCollection     -p  Will generate a postman collection (from the generated openAPI documentation), in json only, if passed in. Default postman.json
```

### README Highlighted Reading

#### Security Details
* [Security](#securityschemes)
* [Security on All Operations](#security-on-each-operation)
* [Security Per Operation](#security)
#### Model Details
* [Models](#models)
* [Notes on Schemas](#notes-on-schemas)

### OpenAPI Mapping

| OpenAPI field            | Serverless field                                                                   |
|--------------------------|------------------------------------------------------------------------------------|
| info.title               | custom.documentation.title  OR  service                                            |
| info.description         | custom.documentation.description  OR  blank string                                 |
| info.version             | custom.documentation.version  OR  random v4 uuid if not provided                   |
| info.termsOfService      | custom.documentation.termsOfService                                                |
| info.contact             | custom.documentation.contact                                                       |
| info.contact.name         | custom.documentation.contact.name OR  blank string                                |
| info.contact.url          | custom.documentation.contact.url  if provided                                     |
| info.license             | custom.documentation.license                                                       |
| info.license.name         | custom.documentation.license.name OR  blank string                                |
| info.license.url          | custom.documentation.license.url  if provided                                     |
| externalDocs.description | custom.documentation.externalDocumentation.description                             |
| externalDocs.url         | custom.documentation.externalDocumentation.url                                     |
| security                        | custom.documentation.security                                               |
| servers[].description      | custom.documentation.servers.description                                         |
| servers[].url              | custom.documentation.servers.url                                                 |
| servers[].variables              | custom.documentation.servers.variables                                     |
| tags[].name                     | custom.documentation.tags.name                                              |
| tags[].description              | custom.documentation.tags.description                                       |
| tags[].externalDocs.url         | custom.documentation.tags.externalDocumentation.url                         |
| tags[].externalDocs.description | custom.documentation.tags.externalDocumentation.description                 |
| path[path]         | functions.functions.events.[http OR httpApi].path                                        |
| path[path].summary         | functions.functions.summary                                                      |
| path[path].description         | functions.functions.description                                              |
| path[path].servers[].description      | functions.functions.servers.description                               |
| path[path].servers[].url              | functions.functions.servers.url                                       |
| path[path].[operation]         | functions.functions.[http OR httpApi].method                                 |
| path[path].[operation].summary             | functions.functions.[http OR httpApi].documentation.summary      |
| path[path].[operation].description         | functions.functions.[http OR httpApi].documentation.description  |
| path[path].[operation].operationId         | functions.functions.[http OR httpApi].documentation.operationId  OR  functionName |
| path[path].[operation].deprecated          | functions.functions.[http OR httpApi].documentation.deprecated   |
| path[path].[operation].externalDocs.description | functions.functions.[http OR httpApi].documentation.externalDocumentation.description  |
| path[path].[operation].externalDocs.url         | functions.functions.[http OR httpApi].documentation.externalDocumentation.url  |
| path[path].[operation].servers[].description      | functions.functions.[http OR httpApi].documentation.servers.description      |
| path[path].[operation].servers[].url              | functions.functions.[http OR httpApi].documentation.servers.url              |
| path[path].[operation].security              | functions.functions.[http OR httpApi].documentation.security              |
| path[path].[operation].deprecated         | functions.functions.[http OR httpApi].documentation.deprecated                       |
| path[path].[operation].parameters         | functions.functions.[http OR httpApi].documentation.[path/query/cookie/header]Params |
| path[path].[operation].parameters.name         | functions.functions.[http OR httpApi].documentation.[path/query/cookie/header]Params.name |
| path[path].[operation].parameters.in         | functions.functions.[http OR httpApi].documentation.[path/query/cookie/header]Params |
| path[path].[operation].parameters.description  | functions.functions.[http OR httpApi].documentation.[path/query/cookie/header]Params.description |
| path[path].[operation].parameters.required     | functions.functions.[http OR httpApi].documentation.[path/query/cookie/header]Params.required |
| path[path].[operation].parameters.deprecated   | functions.functions.[http OR httpApi].documentation.[path/query/cookie/header]Params.deprecated |
| path[path].[operation].parameters.allowEmptyValue  | functions.functions.[http OR httpApi].documentation.[path/query/cookie/header]Params.allowEmptyValue    |
| path[path].[operation].parameters.style | functions.functions.[http OR httpApi].documentation.[path/query/cookie/header]Params.style |
| path[path].[operation].parameters.explode      | functions.functions.[http OR httpApi].documentation.[path/query/cookie/header]Params.explode                    |
| path[path].[operation].parameters.allowReserved         | functions.functions.[http OR httpApi].documentation.[path/query/cookie/header]Params.allowReserved        |
| path[path].[operation].parameters.schema | functions.functions.[http OR httpApi].documentation.[path/query/cookie/header]Params.schema |
| path[path].[operation].parameters.example | functions.functions.[http OR httpApi].documentation.[path/query/cookie/header]Params.example |
| path[path].[operation].parameters.examples | functions.functions.[http OR httpApi].documentation.[path/query/cookie/header]Params.examples |
| path[path].[operation].requestBody         | functions.functions.[http OR httpApi].documentation.requestBody                  |
| path[path].[operation].requestBody.description         | functions.functions.[http OR httpApi].documentation.requestBody.description                  |
| path[path].[operation].requestBody.required         | functions.functions.[http OR httpApi].documentation.requestBody.required                  |
| path[path].[operation].requestBody.content         | functions.functions.[http OR httpApi].documentation.requestModels[contentType].name Links to custom.documentation.models.name                 |
| path[path].[operation].responses         | functions.functions.[http OR httpApi].documentation.methodResponses                  |
| path[path].[operation].requestBody.[statusCode]  | functions.functions.[http OR httpApi].documentation.methodResponses[statusCode] |
| path[path].[operation].requestBody.[statusCode].description | functions.functions.[http OR httpApi].documentation.methodResponses[statusCode].responseBody.description |
| path[path].[operation].requestBody.[statusCode].content | functions.functions.[http OR httpApi].documentation.methodResponses[statusCode].responseModels[contentType] Links to custom.documentation.models.name |


### Configuration

To configure this plugin to generate valid OpenAPI documentation there are two places you'll need to modify in your `serverless.yml` file, the `custom` variables section and the `http` event section for each given function in your service.

The `custom` section of your `serverless.yml` can be configured as below:

```yml
custom:
  documentation:
    version: '1'
    title: 'My API'
    description: 'This is my API'
    termsOfService: https://google.com
    externalDocumentation:
      url: https://google.com
      description: A link to google
    servers:
      url: https://example.com:{port}/
      description: The server
      variables:
        port:
          enum:
            - 4000
            - 3000
          default: 3000
          description: The port the server operates on
    tags:
      - name: tag1
        description: this is a tag
        externalDocumentation:
          url: https://npmjs.com
          description: A link to npm
    models: {}
```

Mostly everything here is optional.  A version from a UUID will be generated for you if you don't specify one, title will be the name of your service if you don't specify one.

#### termsOfService

Must be in the format of a url if included.

#### Contact

You can provide an optional contact object such as:

```yml
custom:
  documentation:
    contact:
      name: John
      url: https://example.com
      email: John@example.com
```

These fields are optional, though `url` and `email` need to be in the format of an email address (ed: what that might be, i'm not 100% sure... go read the email RFC(s)) and a url.

#### License

You can provide an optional license object such as:

```yml
custom:
  documentation:
    license:
      name: Apache 2.0
      url: https://www.apache.org/licenses/LICENSE-2.0.html
```

Name is required but `url` is optional and must be in the format of a url.

#### Extended Fields

You can also add extended fields to the documentation object:

```yml
custom:
  documentation:
    x-other-field: This is an extended field
```

These fields must have `x-` before them, otherwise they will be ignored:

```yml
custom:
  documentation:
    other-field: This is an extended field
```

`other-field` here will not make it to the generated OpenAPI schema.

These configurations can be quite verbose; you can separate it out into it's own file, such as `serverless.doc.yml` as below:

```yml
custom:
  documentation: ${file(serverless.doc.yml):documentation}

functions:
  myFunc:
    events:
      - http:
          path: getStuff
          method: get
          documentation: ${file(serverless.doc.yml):endpoints.myFunc}
```

For more info on `serverless.yml` syntax, see their docs.

#### securitySchemes

You can provide optional Security Schemes:

```yml
custom:
  documentation:
    securitySchemes:
      my_api_key:
        type: apiKey
        name: api_key
        in: header
```

It accepts all available Security Schemes and follows the specification: https://spec.openapis.org/oas/v3.0.3#security-scheme-object

#### Security on each operation

To apply an overall security scheme to all of your operations without having to add the documentation to each one, you can write it like:

```yml
custom:
  documentation:
    securitySchemes:
      my_api_key:
        type: apiKey
        name: api_key
        in: header
    security:
      - my_api_key: []
```

This will apply the requirement of each operation requiring your `my_api_key` security scheme, [you can override this](#security).

#### Models

There are two ways to write the Models.  Models contain additional information that you can use to define schemas for endpoints.  You must define the *content type* for each schema that you provide in the models.

The first way of writing the model is:
*required* directives for the models section are as follow:

* `name`: the name of the schema
* `description`: a description of the schema
* `contentType`: the content type of the described request/response (ie. `application/json` or `application/xml`).
* `schema`: The JSON Schema ([website](http://json-schema.org/)) that describes the model. You can either use inline `YAML` to define these or use either an external file schema that serverless will resolve (as below), or a reference to an externally hosted schema that will be attempted to be resolved.

```yml
custom:
  documentation:
    models:
      - name: "ErrorResponse"
        description: "This is an error"
        contentType: "application/json"
        schema: ${file(models/ErrorResponse.json)}
      - name: "PutDocumentResponse"
        description: "PUT Document response model (external reference example)"
        contentType: "application/json"
        schema: ${file(models/PutDocumentResponse.json)}
      - name: "PutDocumentRequest"
        description: "PUT Document request model (inline example)"
        contentType: "application/json"
        schema:
          $schema: "http://json-schema.org/draft-04/schema#"
          type: object
          properties:
            SomeObject:
              type: "object"
              properties:
                SomeAttribute:
                  type: "string"
        examples:
          - name: someObjectInlineExample
            summary: an example of a request
            description: a longer string than the summary
            value: {SomeObject: {SomeAttribute: 'attribute'}}
          - name: someObjectExternalExample
            summary: an example of a request external
            description: a longer string than the summary
            externalValue: https://example.com/external.json
```

The Second way of writing the models:

* `name`: the name of the schema
* `description`: a description of the schema
* `content`: an Object made up of the contentType and the schema, as shown below

```yml
custom:
  documentation:
    models:
      - name: "ErrorResponse"
        description: "This is an error"
        content:
          application/json:
            schema: ${file(models/ErrorResponse.json)}
      - name: "PutDocumentResponse"
        description: "PUT Document response model (external reference example)"
        content:
          application/json:
            schema: ${file(models/PutDocumentResponse.json)}
      - name: "PutDocumentRequest"
        description: "PUT Document request model (inline example)"
        content:
          application/json:
            schema:
              $schema: "http://json-schema.org/draft-04/schema#"
              type: object
              properties:
                SomeObject:
                  type: "object"
                  properties:
                    SomeAttribute:
                      type: "string"
            examples:
              - name: someObjectInlineExample
                summary: an example of a request
                description: a longer string than the summary
                value: {SomeObject: {SomeAttribute: 'attribute'}}
              - name: someObjectExternalExample
                summary: an example of a request external
                description: a longer string than the summary
                externalValue: https://example.com/external.json
```

##### Model re-use

Through the magic of YAML, you can re-use models:

```yml
custom:
  documentation:
    ...
    models:
      - name: "ErrorResponse"
        description: "This is an error"
        content:
          application/json:
            schema: &ErrorItem
              type: object
              properties:
                message:
                  type: string
                code:
                  type: integer

      - name: "PutDocumentResponse"
        description: "PUT Document response model (external reference example)"
        content:
          application/json:
            schema:
              type: array
              items: *ErrorItem
```

`&ErrorItem` in the above example creates a node anchor (&ErrorItem) to the `ErrorResponse` schema which then can be used in the `PutDocumentResponse` schema via the reference (*ErrorItem).  The node anchor needs to be declared first before it can be used elsewhere via the reference, swapping the above example around would result in an error.

##### ModelsList - Backwards compatibility

It was brought to my attention that an older plugin version allowed the use of `modelsList`.  As of 0.0.60, you can continue to use `modelsList` as well as using `models`, however `modelsList` now has to be nested within the `documentation` section.  You can write `modelsList` the same way as any of the two styles for [Models](#Models).

```
custom:
  documentation:
    ...
    modelsList:
      - name: "ErrorResponse"
        description: "This is an error"
        content:
          application/json:
            schema:
              type: string
```


#### Functions

To define the documentation for a given function event, you need to create a `documentation` attribute for your http event in your `serverless.yml` file.

The `documentation` section of the event configuration can contain the following attributes:

* `summary`: a short description of the method
* `description`: a detailed description of the method
* `tags`: an array of tags for this event
* `deprecated`: boolean indicator that indicates clients should migrate away from this function
* `requestBody`: contains description of the request
    * `description`: a description of the request body
* `requestModels`: a list of models to describe the request bodies (see [requestModels](#requestmodels) below)
* `queryParams`: a list of query parameters (see [queryParams](#queryparams) below)
* `pathParams`: a list of path parameters (see [pathParams](#pathparams) below)
* `cookieParams`: a list of cookie parameters (see [cookieParams](#cookieparams) below)
* `headerParams`: a list of headers (see [headerParams](#headerparams---request-headers) below)
* `security`: The security requirement to apply (see [security](#security) below)
* `methodResponses`: an array of response models and applicable status codes
  * `statusCode`: applicable http status code (ie. 200/404/500 etc.)
  * `responseBody`: contains description of the response
    * `description`: a description of the body response
  * `responseHeaders`: a list of response headers (see [responseHeaders](#responseheaders) below)
  * `responseModels`: a list of models to describe the request bodies (see [responseModels](#responsemodels) below) for each `Content-Type`

```yml
functions:
  createUser:
    handler: handler.create
    events:
      - http:
        path: create
        method: post
        cors: true
        summary:
        documentation:
          summary: "Create User"
          description: "Creates a user and then sends a generated password email"
          tags:
            - tag1
          externalDocumentation:
            url: https://bing.com
            description: A link to bing
          requestBody:
            description: "A user information object"
          requestModels:
            application/json: "PutDocumentRequest"
          pathParams:
            - name: "username"
              description: "The username for a user to create"
              schema:
                type: "string"
                pattern: "^[-a-z0-9_]+$"
          queryParams:
            - name: "membershipType"
              description: "The user's Membership Type"
              schema:
                type: "string"
                enum:
                  - "premium"
                  - "standard"
          cookieParams:
            - name: "SessionId"
              description: "A Session ID variable"
              schema:
                type: "string"
          headerParams:
            name: "Content-Type"
            description: "The content type"
            schema:
              type: "string"
          methodResponses:
            - statusCode: 201
              responseBody:
                description: "A user object along with generated API Keys"
              responseModels:
                application/json: "PutDocumentResponse"
              responseHeaders:
                X-Rate-Limit-Limit:
                  description: The number of allowed requests in the current period
                  schema:
                    type: integer
            - statusCode: 500
              responseBody:
                description: "An error message when creating a new user"
              responseModels:
                application/json: "ErrorResponse"
```

#### `queryParams`

Query parameters can be described as follow:

* `name`: the name of the query variable
* `description`: a description of the query variable
* `required`: whether the query parameter is mandatory (boolean)
* `schema`: JSON schema (inline, file or externally hosted)

```yml
queryParams:
  - name: "filter"
    description: "The filter parameter"
    required: true
    schema:
      type: "string"
```

#### `pathParams`

Path parameters can be described as follow:

* `name`: the name of the path parameter
* `description`: a description of the path parameter
* `schema`: JSON schema (inline, file or externally hosted)

```yml
pathParams:
  - name: "usernameId"
    description: "The usernameId parameter"
    schema:
      type: "string"
```

#### `cookieParams`

Cookie parameters can be described as follow:

* `name`: the name of the cookie parameter
* `description`: a description of the cookie parameter
* `required`: whether the cookie parameter is mandatory (boolean)
* `schema`: JSON schema (inline, file or externally hosted)

```yml
cookieParams:
  - name: "sessionId"
    description: "The sessionId parameter"
    required: true
    schema:
      type: "string"
```

#### `headerParams` - Request Headers

Request Headers can be described as follow:

* `name`: the name of the header
* `description`: a description of the header
* `required`: whether the header is mandatory (boolean)
* `schema`: JSON schema (inline, file or externally hosted)

```yml
headerParams:
  - name: "Content-Type"
    description: "The content type"
    required: true
    schema:
      type: "string"
```

#### `security`

The `security` property allows you to specify the [Security Scheme](#securityschemes) to apply to the HTTP Request.  If you have applied an `security` ([see Security on each operation](#security-on-each-operation)) then you can either leave this field off, or to override it with a different scheme you can write it like:

```yml
custom:
  documentation:
    securitySchemes:
      my_api_key:
        type: apiKey
        name: api_key
        in: header
      petstore_auth:
        type: oauth2
        flows:
          implicit:
            authorizationUrl: https://example.com/api/oauth/dialog
            scopes:
              write:pets: modify pets in your account
              read:pets: read your pets
    security:
      - my_api_key: []

functions:
  getData:
    events:
      - http:
          documentation:
            security:
              - petstore_auth:
                - write:pets
                - read:pets
```

If you have specified an `security` at the document root, but this HTTP Request should not apply any security schemes, you should set security to be an array with an empty object:

```yml
custom:
  documentation:
    securitySchemes:
      my_api_key:
        type: apiKey
        name: api_key
        in: header
    security:
      - my_api_key: []

functions:
  getData:
    events:
      - http:
          documentation:
            security:
              - {}
```

#### `requestModels`

The `requestModels` property allows you to define models for the HTTP Request of the function event. You can define a different model for each different `Content-Type`. You can define a reference to the relevant request model named in the `models` section of your configuration (see [Defining Models](#models) section).

```yml
requestModels:
  application/json: "CreateRequest"
  application/xml: "CreateRequestXML"
```

#### `methodResponses`

You can define the response schemas by defining properties for your function event.

For an example of a `methodResponses` configuration for an event see below:

```yml
methodResponse:
  - statusCode: 200
    responseBody:
      description: Success
    responseModels:
      application/json: "CreateResponse"
      application/xml: "CreateResponseXML"
    responseHeaders:
      X-Rate-Limit-Limit:
        description: The number of allowed requests in the current period
        schema:
          type: integer
      X-Rate-Limit-Remaining:
        description: The number of remaining requests in the current period
        schema:
          type: integer
      X-Rate-Limit-Reset:
        description: The number of seconds left in the current period
        schema:
          type: integer
```

##### `responseModels`

The `responseModels` property allows you to define models for the HTTP Response of the function event. You can define a different model for each different `Content-Type`. You can define a reference to the relevant response model named in the `models` section of your configuration (see [Defining Models](#models) section).

```yml
responseModels:
  application/json: "CreateResponse"
  application/xml: "CreateResponseXML"
```

##### `responseHeaders`

The `responseHeaders` property allows you to define the headers expected in a HTTP Response of the function event.  This should only contain a description and a schema, which must be a JSON schema (inline, file or externally hosted).

```yml
responseHeaders:
  X-Rate-Limit-Limit:
    description: The number of allowed requests in the current period
    schema:
      type: integer
```

###### CORS

You can automatically generate CORS response headers by setting `cors` at the function level.  Serverless allows you to modify how CORS is setup, so you can have the default options with `cors: true`, or you can modify the settings as shown in the [serverless documentation for CORS](https://www.serverless.com/framework/docs/providers/aws/events/apigateway#enabling-cors).

The generator will interpret your settings for CORS and automatically add the response headers.  If for whatever reason you wish to override these, you can set them via the above `responseHeaders` setting and it'll apply your overrides.

## Example configuration

Please view the example [serverless.yml](test/serverless-tests/serverless%202/serverless.yml).

## Notes on schemas

Schemas can be either: inline, in file or externally hosted.  If they're inline or in file, the plugin will attempt to normalise the schema to [OpenAPI 3.0.X specification](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.0.md#schemaObject).

If they exist as an external reference, for instance:

```yaml
schema: https://raw.githubusercontent.com/SchemaStore/schemastore/master/src/schemas/json/bettercodehub.json
```

We use the plugin [JSON Schema $Ref Parser](https://apitools.dev/json-schema-ref-parser/) to attempt to parse and resolve the references.  There are limitations to this.  Consider the schema:

```json
{
    "$schema": "https://json-schema.org/draft-04/schema",
    "title": "Reusable Definitions",
    "type": "object",
    "id": "https://raw.githubusercontent.com/json-editor/json-editor/master/tests/fixtures/definitions.json",
    "definitions": {
        "address": {
            "title": "Address",
            "type": "object",
            "properties": {
                "street_address": { "type": "string" },
                "city":           { "type": "string" },
                "state":          { "type": "string" }
            },
            "required": ["street_address"]
        },
        "link" : {"$refs": "./properties.json#/properties/title"}
    },
    "properties": {
        "address" : {"$refs": "#/definitions/address"}
    }
  }
```
Where the definition "link" refers to a schema held in a directory that the resolver does not know about, we will not be able to fully resolve the schema which will likely cause errors in validation of the openAPI 3.0.X specification.

Because of the dependency we use to parse externally linked schemas, we can supply our own options to resolve schemas that are more difficult than a straight forward example.

You can create your own options file: https://apitools.dev/json-schema-ref-parser/docs/options.html to pass into the dependency that contains it's own resolver to allow you to resolve references that might be in hard to reach places.  In your main project folder, you should have a folder called `options` with a file called `ref-parser.js` that looks like:

```js
'use strict'

// options from: https://apitools.dev/json-schema-ref-parser/docs/options.html

module.exports = {
  continueOnError: true,            // Don't throw on the first error
  parse: {
    json: false,                    // Disable the JSON parser
    yaml: {
      allowEmpty: false             // Don't allow empty YAML files
    },
    text: {
      canParse: [".txt", ".html"],  // Parse .txt and .html files as plain text (strings)
      encoding: 'utf16'             // Use UTF-16 encoding
    }
  },
  resolve: {
    file: false,                    // Don't resolve local file references
    http: {
      timeout: 2000,                // 2 second timeout
      withCredentials: true,        // Include auth credentials when resolving HTTP references
    }
  },
  dereference: {
    circular: false,                // Don't allow circular $refs
    excludedPathMatcher: (path) =>  // Skip dereferencing content under any 'example' key
      path.includes("/example/")
  }
}
```

If you don't supply this file, it will use the default options.

## License

MIT
