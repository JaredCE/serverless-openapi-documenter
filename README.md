# OpenAPI Generator for serverless

This will generate an OpenAPI V3 (up to v3.0.3) file for you from your serverless file.  It can optionally generate a Postman Collection V2 from the OpenAPI file for you too.

Originally based off of: https://github.com/temando/serverless-openapi-documentation

## Install

This plugin works for Serverless 2.x and up.

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

### OpenAPI Mapping

| OpenAPI field            | Serverless field                                                                   |
|--------------------------|------------------------------------------------------------------------------------|
| info.title               | custom.documentation.title  OR  service                                            |
| info.description         | custom.documentation.description  OR  blank string                                 |
| info.version             | custom.documentation.version  OR  random v4 uuid if not provided                   |
| externalDocs.description | custom.documentation.externalDocumentation.description                             |
| externalDocs.url         | custom.documentation.externalDocumentation.url                                     |
| servers[].description      | custom.documentation.servers.description                                           |
| servers[].url              | custom.documentation.servers.url                                                   |
| path[path]         | functions.functions.events.[http OR httpApi].path                                        |
| path[path].summary         | functions.functions.summary                                                      |
| path[path].description         | functions.functions.description                                              |
| path[path].servers[].description      | functions.functions.servers.description                                           |
| path[path].servers[].url              | functions.functions.servers.url                                                   |
| path[path].[operation]         | functions.functions.[http OR httpApi].method                                 |
| path[path].[operation].summary             | functions.functions.[http OR httpApi].documentation.summary      |
| path[path].[operation].description         | functions.functions.[http OR httpApi].documentation.description  |
| path[path].[operation].operationId         | functions.functions.[http OR httpApi].documentation.operationId  OR  functionName |
| path[path].[operation].deprecated          | functions.functions.[http OR httpApi].documentation.deprecated   |
| path[path].[operation].externalDocs.description | functions.functions.[http OR httpApi].documentation.externalDocumentation.description  |
| path[path].[operation].externalDocs.url         | functions.functions.[http OR httpApi].documentation.externalDocumentation.url  |
| path[path].[operation].servers[].description      | functions.functions.[http OR httpApi].documentation.servers.description      |
| path[path].[operation].servers[].url              | functions.functions.[http OR httpApi].documentation.servers.url              |
| path[path].[operation].deprecated         | functions.functions.[http OR httpApi].documentation.deprecated                       |
| path[path].[operation].parameters         | functions.functions.[http OR httpApi].documentation.[path|query|cookie|header]Params |
| path[path].[operation].parameters.name         | functions.functions.[http OR httpApi].documentation.[path|query|cookie|header]Params.name |
| path[path].[operation].parameters.in         | functions.functions.[http OR httpApi].documentation.[path|query|cookie|header]Params |
| path[path].[operation].parameters.description  | functions.functions.[http OR httpApi].documentation.[path|query|cookie|header]Params.description |
| path[path].[operation].parameters.required     | functions.functions.[http OR httpApi].documentation.[path|query|cookie|header]Params.required |
| path[path].[operation].parameters.deprecated   | functions.functions.[http OR httpApi].documentation.[path|query|cookie|header]Params.deprecated |
| path[path].[operation].parameters.allowEmptyValue  | functions.functions.[http OR httpApi].documentation.[path|query|cookie|header]Params.allowEmptyValue    |
| path[path].[operation].parameters.style | functions.functions.[http OR httpApi].documentation.[path|query|cookie|header]Params.style |
| path[path].[operation].parameters.explode      | functions.functions.[http OR httpApi].documentation.[path|query|cookie|header]Params.explode                    |
| path[path].[operation].parameters.allowReserved         | functions.functions.[http OR httpApi].documentation.[path|query|cookie|header]Params.allowReserved        |
| path[path].[operation].parameters.schema | functions.functions.[http OR httpApi].documentation.[path|query|cookie|header]Params.schema |
| path[path].[operation].parameters.example | functions.functions.[http OR httpApi].documentation.[path|query|cookie|header]Params.example |
| path[path].[operation].parameters.examples | functions.functions.[http OR httpApi].documentation.[path|query|cookie|header]Params.examples |
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
    models: {}
    externalDocumentation:
      url: https://google.com
      description: A link to google
    servers:
      url: https://example.com
      description: The server
```

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

#### Models

Models contain additional information that you can use to define schemas for endpoints.  You must define the *content type* for each schema that you provide in the models.

The *required* directives for the models section are as follow:

* `name`: the name of the schema
* `description`: a description of the schema
* `contentType`: the content type of the described request/response (ie. `application/json` or `application/xml`).
* `schema`: The JSON Schema ([website](http://json-schema.org/)) that describes the model. You can either use inline `YAML` to define these, or refer to an external schema file as below

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
          properties:
            SomeObject:
              type: "object"
              properties:
                SomeAttribute:
                  type: "string"
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
* `methodResponses`: an array of response models and applicable status codes
  * `statusCode`: applicable http status code (ie. 200/404/500 etc.)
  * `responseBody`: contains description of the response
    * `description`: a description of the body response
  * `responseHeaders`: a list of response headers (see [responseHeaders](#responseheaders) below)
  * `responseModels`: a list of models to describe the request bodies (see [responseModels](#responsemodels) below) for each `Content-Type`

```yml
functions:
  createUser:
    handler: "handler.create"
    events:
      - http:
        path: "create"
        method: "post"
        documentation:
          summary: "Create User"
          description: "Creates a user and then sends a generated password email"
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
          methodResponses:
            - statusCode: 201
              responseBody:
                description: "A user object along with generated API Keys"
              responseModels:
                application/json: "PutDocumentResponse"
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
* `schema`: JSON schema (inline or file)

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

* `name`: the name of the query variable
* `description`: a description of the query variable
* `schema`: JSON schema (inline or file)

```yml
pathParams:
  - name: "usernameId"
    description: "The usernameId parameter"
    schema:
      type: "string"
```

#### `cookieParams`

Cookie parameters can be described as follow:

* `name`: the name of the query variable
* `description`: a description of the query variable
* `required`: whether the query parameter is mandatory (boolean)
* `schema`: JSON schema (inline or file)

```yml
cookieParams:
  - name: "sessionId"
    description: "The sessionId parameter"
    required: true
    schema:
      type: "string"
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
    responseHeaders:
      - name: "Content-Type"
        description: "Content Type header"
        schema:
          type: "string"
    responseModels:
      application/json: "CreateResponse"
      application/xml: "CreateResponseXML"
```

##### `responseModels`

The `responseModels` property allows you to define models for the HTTP Response of the function event. You can define a different model for each different `Content-Type`. You can define a reference to the relevant response model named in the `models` section of your configuration (see [Defining Models](#models) section).

```yml
responseModels:
  application/json: "CreateResponse"
  application/xml: "CreateResponseXML"
```

##### `responseHeaders` and `requestHeaders`

The `responseHeaders/requestHeaders` section of the configuration allows you to define the HTTP headers for the function event.

The attributes for a header are as follow:

* `name`: the name of the HTTP Header
* `description`: a description of the HTTP Header
* `schema`: JSON schema (inline or file)

```yml
responseHeaders:
  - name: "Content-Type"
    description: "Content Type header"
    schema:
      type: "string"
requestHeaders:
  - name: "Content-Type"
    description: "Content Type header"
    schema:
      type: "string"
```

## Example configuration

Please view the example [serverless.yml](test/serverless\ 2/serverless.yml).

## License

MIT
