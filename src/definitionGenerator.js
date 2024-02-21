"use strict";

const path = require("path");

const {
  Config,
  lintFromString,
  stringifyYaml,
  createConfig,
} = require("@redocly/openapi-core");
const isEqual = require("lodash.isequal");
const { v4: uuid } = require("uuid");

const SchemaHandler = require("./schemaHandler");
const oWASP = require("./owasp");

class DefinitionGenerator {
  constructor(serverless, options = {}) {
    this.version =
      serverless?.processedInput?.options?.openApiVersion || "3.0.0";

    this.serverless = serverless;
    this.httpKeys = {
      http: "http",
      httpAPI: "httpApi",
    };

    this.componentsSchemas = {
      requestBody: "requestBodies",
      responses: "responses",
    };

    this.openAPI = {
      openapi: this.version,
      components: {
        schemas: {},
      },
    };

    this.schemaHandler = new SchemaHandler(serverless, this.openAPI);

    this.operationIdMap = {};
    this.functionMap = {};

    this.operationIds = [];
    this.schemaIDs = [];

    this.componentTypes = {
      schemas: "schemas",
      securitySchemes: "securitySchemes",
    };

    this.DEFAULT_CORS_HEADERS = {
      "Access-Control-Allow-Origin": {
        description:
          "The Access-Control-Allow-Origin response header indicates whether the response can be shared with requesting code from the given [origin](https://developer.mozilla.org/en-US/docs/Glossary/Origin). - [MDN Link](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin)",
        schema: {
          type: "string",
          default: "*",
          example: "https://developer.mozilla.org",
        },
      },
      "Access-Control-Allow-Credentials": {
        description: `The Access-Control-Allow-Credentials response header tells browsers whether to expose the response to the frontend JavaScript code when the request's credentials mode ([Request.credentials](https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials)) is include. - [MDN Link](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Credentials)`,
        schema: {
          type: "boolean",
          default: true,
        },
      },
    };

    try {
      this.refParserOptions = require(path.resolve("options", "ref-parser.js"));
    } catch (err) {
      this.refParserOptions = {};
    }
  }

  async parse() {
    this.createInfo();

    await oWASP.getLatest();

    await this.schemaHandler.addModelsToOpenAPI().catch((err) => {
      throw err;
    });

    if (this.serverless.service.custom.documentation.securitySchemes) {
      this.createSecuritySchemes(
        this.serverless.service.custom.documentation.securitySchemes
      );

      if (this.serverless.service.custom.documentation.security) {
        this.openAPI.security =
          this.serverless.service.custom.documentation.security;
      }
    }

    await this.createPaths().catch((err) => {
      throw err;
    });

    this.cleanupLinks();

    if (this.serverless.service.custom.documentation.servers) {
      const servers = this.createServers(
        this.serverless.service.custom.documentation.servers
      );
      Object.assign(this.openAPI, { servers: servers });
    }

    if (this.serverless.service.custom.documentation.tags) {
      this.createTags();
    }

    if (this.serverless.service.custom.documentation.externalDocumentation) {
      const extDoc = this.createExternalDocumentation(
        this.serverless.service.custom.documentation.externalDocumentation
      );
      Object.assign(this.openAPI, { externalDocs: extDoc });
    }
  }

  createInfo() {
    const service = this.serverless.service;
    const documentation = this.serverless.service.custom.documentation;

    const info = {
      title: documentation?.title || service.service,
      description: documentation?.description || "",
      version: documentation?.version || uuid(),
    };

    if (documentation.termsOfService)
      info.termsOfService = documentation.termsOfService;

    if (documentation.contact) {
      const contactObj = {};
      contactObj.name = documentation.contact.name || "";

      if (documentation.contact.url) contactObj.url = documentation.contact.url;

      contactObj.email = documentation.contact.email || "";
      Object.assign(info, { contact: contactObj });
    }

    if (documentation.license && documentation.license.name) {
      const licenseObj = {};
      licenseObj.name = documentation.license.name || "";

      if (documentation.license.url)
        licenseObj.url = documentation.license.url || "";

      Object.assign(info, { license: licenseObj });
    }

    // for (const key of Object.keys(documentation)) {
    //   if (/^[x\-]/i.test(key)) {
    //     Object.assign(info, { [key]: documentation[key] });
    //   }
    // }

    const extendedSpec = this.extendSpecification(documentation);

    if (Object.keys(extendedSpec).length) {
      Object.assign(info, extendedSpec);
    }

    Object.assign(this.openAPI, { info });
  }

  async createPaths() {
    const paths = {};
    const httpFunctions = this.getHTTPFunctions();

    for (const httpFunction of httpFunctions) {
      for (const event of httpFunction.event) {
        if (event?.http?.documentation || event?.httpApi?.documentation) {
          this.currentEvent = event?.http || event?.httpApi;
          const documentation =
            event?.http?.documentation || event?.httpApi?.documentation;

          this.currentFunctionName = httpFunction.functionInfo.name;
          this.operationName = httpFunction.operationName;

          const path = await this.createOperationObject(
            event?.http?.method || event?.httpApi?.method,
            documentation
          ).catch((err) => {
            throw err;
          });

          // if (httpFunction.functionInfo?.summary)
          //   path.summary = httpFunction.functionInfo.summary;

          // if (httpFunction.functionInfo?.description)
          //   path.description = httpFunction.functionInfo.description;

          if (httpFunction.functionInfo?.servers) {
            const servers = this.createServers(
              httpFunction.functionInfo.servers
            );
            path.servers = servers;
          }

          let slashPath = (event?.http?.path || event.httpApi?.path) ?? "/";
          const pathStart = new RegExp(/^\//, "g");
          if (pathStart.test(slashPath) === false) {
            slashPath = `/${(event?.http?.path || event.httpApi?.path) ?? ""}`;
          }

          if (paths[slashPath]) {
            Object.assign(paths[slashPath], path);
          } else {
            Object.assign(paths, { [slashPath]: path });
          }
        }
      }
    }
    Object.assign(this.openAPI, { paths });
  }

  createServers(servers) {
    const serverDoc = servers;
    const newServers = [];

    if (Array.isArray(serverDoc)) {
      for (const server of serverDoc) {
        const obj = {
          url: server.url,
        };

        if (server.description) {
          obj.description = server.description;
        }

        if (server.variables) {
          obj.variables = server.variables;
        }

        newServers.push(obj);
      }
    } else {
      const obj = {
        url: servers.url,
      };

      if (servers.description) {
        obj.description = servers.description;
      }

      if (servers.variables) {
        obj.variables = servers.variables;
      }

      newServers.push(obj);
    }

    return newServers;
  }

  createExternalDocumentation(docs) {
    return { ...docs };
    // const documentation = this.serverless.service.custom.documentation
    // if (documentation.externalDocumentation) {
    //     // Object.assign(this.openAPI, {externalDocs: {...documentation.externalDocumentation}})
    //     return
    // }
  }

  createTags() {
    const tags = [];
    for (const tag of this.serverless.service.custom.documentation.tags) {
      const obj = {
        name: tag.name,
      };

      if (tag.description) {
        obj.description = tag.description;
      }

      if (tag.externalDocumentation) {
        obj.externalDocs = this.createExternalDocumentation(
          tag.externalDocumentation
        );
      }
      tags.push(obj);
    }
    Object.assign(this.openAPI, { tags: tags });
  }

  async createOperationObject(method, documentation) {
    let operationId = documentation?.operationId || this.operationName;
    if (this.operationIds.includes(operationId)) {
      operationId += `-${uuid()}`;
    }

    const arr = this.functionMap[this.operationName];
    arr.push(operationId);
    this.functionMap[this.operationName] = arr;

    this.operationIds.push(operationId);
    Object.assign(this.operationIdMap, {
      [operationId]: this.operationName,
    });

    const obj = {
      summary: documentation.summary || "",
      description: documentation.description || "",
      operationId: operationId,
      parameters: [],
      tags: documentation.tags || [],
    };

    if (documentation.pathParams) {
      const paramObject = await this.createParamObject(
        "path",
        documentation
      ).catch((err) => {
        throw err;
      });
      obj.parameters = obj.parameters.concat(paramObject);
    }

    if (documentation.queryParams) {
      const paramObject = await this.createParamObject(
        "query",
        documentation
      ).catch((err) => {
        throw err;
      });
      obj.parameters = obj.parameters.concat(paramObject);
    }

    if (documentation.headerParams) {
      const paramObject = await this.createParamObject(
        "header",
        documentation
      ).catch((err) => {
        throw err;
      });
      obj.parameters = obj.parameters.concat(paramObject);
    }

    if (documentation.cookieParams) {
      const paramObject = await this.createParamObject(
        "cookie",
        documentation
      ).catch((err) => {
        throw err;
      });
      obj.parameters = obj.parameters.concat(paramObject);
    }

    if (documentation.externalDocumentation) {
      obj.externalDocs = documentation.externalDocumentation;
    }

    if (Object.keys(documentation).includes("security")) {
      obj.security = documentation.security;
    }

    if (this.currentEvent?.private && this.currentEvent.private === true) {
      let apiKeyName = "x-api-key";
      let hasXAPIKey = false;
      if (this.openAPI?.components?.[this.componentTypes.securitySchemes]) {
        for (const [schemeName, schemeValue] of Object.entries(
          this.openAPI.components[this.componentTypes.securitySchemes]
        )) {
          if (
            schemeValue.type === "apiKey" &&
            schemeValue.name === "x-api-key"
          ) {
            apiKeyName = schemeName;
            hasXAPIKey = true;
          }
        }
      }

      if (hasXAPIKey === false) {
        this.createSecuritySchemes({
          [apiKeyName]: { type: "apiKey", name: apiKeyName, in: "header" },
        });
      }

      if (obj.security) {
        obj.security.push({ [apiKeyName]: [] });
      } else {
        obj.security = [{ [apiKeyName]: [] }];
      }
    }

    if (Object.keys(documentation).includes("deprecated"))
      obj.deprecated = documentation.deprecated;

    if (documentation.requestBody || this.currentEvent?.request?.schemas) {
      const requestModel = {};
      if (documentation.requestBody) {
        Object.assign(requestModel, {
          description: documentation.requestBody.description,
          models: documentation.requestModels,
          required: documentation.requestBody.required,
        });
      } else {
        Object.assign(requestModel, {
          description: "",
          models: this.currentEvent?.request?.schemas,
        });
      }

      obj.requestBody = await this.createRequestBody(requestModel).catch(
        (err) => {
          throw err;
        }
      );
    }

    if (documentation.methodResponses)
      obj.responses = await this.createResponses(documentation).catch((err) => {
        throw err;
      });

    if (documentation.servers) {
      const servers = this.createServers(documentation.servers);
      obj.servers = servers;
    }

    const extendedSpec = this.extendSpecification(documentation);

    if (Object.keys(extendedSpec).length) {
      Object.assign(obj, extendedSpec);
    }

    return { [method.toLowerCase()]: obj };
  }

  async createResponses(documentation) {
    const responses = {};
    for (const response of documentation.methodResponses) {
      const obj = {
        description: response.responseBody.description || "",
      };

      this.currentStatusCode = response.statusCode;

      if (response?.responseModels) {
        obj.content = await this.createMediaTypeObject(
          response.responseModels,
          "responses"
        ).catch((err) => {
          throw err;
        });
      }

      if (response.responseHeaders) {
        obj.headers = await this.createResponseHeaders(
          response.responseHeaders
        ).catch((err) => {
          throw err;
        });
      }

      let owaspHeaders = {};
      if (response.owasp) {
        if (typeof response.owasp === "boolean") {
          owaspHeaders = await this.createResponseHeaders(
            oWASP.DEFAULT_OWASP_HEADERS
          ).catch((err) => {
            throw err;
          });
        } else {
          owaspHeaders = await this.createResponseHeaders(
            oWASP.getHeaders(response.owasp)
          ).catch((err) => {
            throw err;
          });
        }
      }

      const corsHeaders = await this.corsHeaders().catch((err) => {
        throw err;
      });

      const addHeaders = (headers) => {
        for (const key in headers) {
          if (!(key in obj.headers) && (obj.headers[key] = {})) {
            obj.headers[key] = headers[key];
          }
        }
      };

      if (obj.headers) {
        addHeaders(corsHeaders);
        addHeaders(owaspHeaders);
      } else {
        if (Object.keys(corsHeaders).length) {
          obj.headers = corsHeaders;
          addHeaders(owaspHeaders);
        } else {
          obj.headers = owaspHeaders;
        }
      }

      if (response.links) {
        obj.links = this.createLinks(response.links);
      }

      Object.assign(responses, { [response.statusCode]: obj });
    }

    return responses;
  }

  async corsHeaders() {
    let headers = {};
    if (this.currentEvent?.cors === true) {
      headers = await this.createResponseHeaders(
        this.DEFAULT_CORS_HEADERS
      ).catch((err) => {
        throw err;
      });
    } else if (this.currentEvent.cors) {
      const newHeaders = {};
      for (const key of Object.keys(this.DEFAULT_CORS_HEADERS)) {
        if (
          key === "Access-Control-Allow-Credentials" &&
          (this.currentEvent.cors.allowCredentials === undefined ||
            this.currentEvent.cors?.allowCredentials === false)
        ) {
          continue;
        }

        const obj = JSON.parse(JSON.stringify(this.DEFAULT_CORS_HEADERS[key]));

        if (key === "Access-Control-Allow-Origin") {
          if (
            this.currentEvent.cors?.origins ||
            this.currentEvent.cors?.origin
          ) {
            obj.schema.example =
              this.currentEvent.cors?.origins?.toString() ||
              this.currentEvent.cors?.origin?.toString();
          } else if (this.currentEvent.cors?.allowedOrigins) {
            obj.schema.example =
              this.currentEvent.cors.allowedOrigins.toString();
          }
        }

        Object.assign(newHeaders, { [key]: obj });
      }

      headers = await this.createResponseHeaders(newHeaders).catch((err) => {
        throw err;
      });
    }

    return headers;
  }

  async createResponseHeaders(headers) {
    const obj = {};

    for (const header of Object.keys(headers)) {
      const newHeader = {};
      newHeader.description = headers[header].description || "";

      if (headers[header].schema) {
        const schemaRef = await this.schemaHandler
          .createSchema(header, headers[header].schema)
          .catch((err) => {
            throw err;
          });
        newHeader.schema = {
          $ref: schemaRef,
        };
      }

      Object.assign(obj, { [header]: newHeader });
    }

    return obj;
  }

  async createRequestBody(requestBodyDetails) {
    const obj = {
      description: requestBodyDetails.description,
      required: requestBodyDetails.required || false,
    };

    obj.content = await this.createMediaTypeObject(
      requestBodyDetails.models
    ).catch((err) => {
      throw err;
    });

    return obj;
  }

  async createMediaTypeObject(models, type) {
    const mediaTypeObj = {};

    for (const mediaTypeDocumentation of this.schemaHandler.models) {
      if (models === undefined || models === null) {
        throw new Error(
          `${this.currentFunctionName} is missing a Response Model for statusCode ${this.currentStatusCode}`
        );
      }

      if (Object.values(models).includes(mediaTypeDocumentation.name)) {
        let contentKey = "";
        for (const [key, value] of Object.entries(models)) {
          if (value === mediaTypeDocumentation.name) contentKey = key;
        }
        const obj = {};

        let schema;
        if (mediaTypeDocumentation?.content) {
          if (mediaTypeDocumentation.content[contentKey]?.example)
            obj.example = mediaTypeDocumentation.content[contentKey].example;

          if (mediaTypeDocumentation.content[contentKey]?.examples)
            obj.examples = this.createExamples(
              mediaTypeDocumentation.content[contentKey].examples
            );

          schema = mediaTypeDocumentation.content[contentKey].schema;
        } else if (
          mediaTypeDocumentation?.contentType &&
          mediaTypeDocumentation.schema
        ) {
          if (mediaTypeDocumentation?.example)
            obj.example = mediaTypeDocumentation.example;

          if (mediaTypeDocumentation?.examples)
            obj.examples = this.createExamples(mediaTypeDocumentation.examples);

          schema = mediaTypeDocumentation.schema;
        }

        const schemaRef = await this.schemaHandler
          .createSchema(mediaTypeDocumentation.name)
          .catch((err) => {
            throw err;
          });

        obj.schema = {
          $ref: schemaRef,
        };

        Object.assign(mediaTypeObj, { [contentKey]: obj });
      }
    }

    if (Object.keys(mediaTypeObj).length === 0) {
      for (const contentKey of Object.keys(models)) {
        const obj = {};
        const schema = models[contentKey]?.schema
          ? models[contentKey].schema
          : models[contentKey];
        const name = models[contentKey]?.name
          ? models[contentKey].name
          : uuid();
        const schemaRef = await this.schemaHandler
          .createSchema(name, schema)
          .catch((err) => {
            throw err;
          });

        obj.schema = {
          $ref: schemaRef,
        };

        Object.assign(mediaTypeObj, { [contentKey]: obj });
      }
    }

    return mediaTypeObj;
  }

  async createParamObject(paramIn, documentation) {
    const params = [];
    for (const param of documentation[`${paramIn}Params`]) {
      const obj = {
        name: param.name,
        in: paramIn,
        description: param.description || "",
        required: paramIn === "path" ? true : param.required || false,
      };

      if (Object.keys(param).includes("deprecated")) {
        obj.deprecated = param.deprecated;
      }

      if (
        paramIn === "query" &&
        Object.keys(param).includes("allowEmptyValue")
      ) {
        obj.allowEmptyValue = param.allowEmptyValue;
      }

      if (param.style) obj.style = param.style;

      if (Object.keys(param).includes("explode")) obj.explode = param.explode;

      if (paramIn === "query" && param.allowReserved)
        obj.allowReserved = param.allowReserved;

      if (param.example) obj.example = param.example;

      if (param.examples) obj.examples = this.createExamples(param.examples);

      if (param.schema) {
        const schemaRef = await this.schemaHandler
          .createSchema(param.name, param.schema)
          .catch((err) => {
            throw err;
          });
        obj.schema = {
          $ref: schemaRef,
        };
      }

      params.push(obj);
    }
    return params;
  }

  createLinks(links) {
    const linksObj = {};
    for (const link in links) {
      const linkObj = links[link];
      const obj = {};

      obj.operationId = linkObj.operation;

      if (linkObj.description) {
        obj.description = linkObj.description;
      }

      if (linkObj.server) {
        obj.server = this.createServers(linkObj.server);
      }

      if (linkObj.parameters) {
        obj.parameters = linkObj.parameters;
      }

      if (linkObj.requestBody) {
        obj.requestBody = linkObj.requestBody;
      }

      Object.assign(linksObj, { [link]: obj });
    }

    return linksObj;
  }

  addToComponents(type, schema, name) {
    const schemaObj = {
      [name]: schema,
    };

    let newName = name;

    if (this.openAPI?.components) {
      if (this.openAPI.components[type]) {
        if (
          this.openAPI.components[type][name] &&
          isEqual(schemaObj[name], this.openAPI.components[type][name]) ===
            false
        ) {
          delete schemaObj[name];
          newName = `${name}-${uuid()}`;
          schemaObj[newName] = schema;
        }

        Object.assign(this.openAPI.components[type], schemaObj);
      } else {
        Object.assign(this.openAPI.components, { [type]: schemaObj });
      }
    } else {
      const components = {
        components: {
          [type]: schemaObj,
        },
      };

      Object.assign(this.openAPI, components);
    }

    return newName;
  }

  createSecuritySchemes(securitySchemes) {
    for (const scheme of Object.keys(securitySchemes)) {
      const securityScheme = securitySchemes[scheme];
      const schema = {};

      if (securityScheme.description)
        schema.description = securityScheme.description;

      switch (securityScheme.type.toLowerCase()) {
        case "apikey":
          const apiKeyScheme = this.createAPIKeyScheme(securityScheme);
          schema.type = "apiKey";
          Object.assign(schema, apiKeyScheme);
          break;

        case "http":
          const HTTPScheme = this.createHTTPScheme(securityScheme);
          schema.type = "http";
          Object.assign(schema, HTTPScheme);
          break;

        case "openidconnect":
          const openIdConnectScheme =
            this.createOpenIDConnectScheme(securityScheme);
          schema.type = "openIdConnect";
          Object.assign(schema, openIdConnectScheme);
          break;

        case "oauth2":
          const oAuth2Scheme = this.createOAuth2Scheme(securityScheme);
          schema.type = "oauth2";
          Object.assign(schema, oAuth2Scheme);
          break;
      }

      this.addToComponents(this.componentTypes.securitySchemes, schema, scheme);
    }
  }

  createAPIKeyScheme(securitySchema) {
    const schema = {};
    if (securitySchema.name) schema.name = securitySchema.name;
    else
      throw new Error(
        'Security Scheme for "apiKey" requires the name of the header, query or cookie parameter to be used'
      );

    if (securitySchema.in) schema.in = securitySchema.in;
    else
      throw new Error(
        'Security Scheme for "apiKey" requires the location of the API key: header, query or cookie parameter'
      );

    return schema;
  }

  createHTTPScheme(securitySchema) {
    const schema = {};

    if (securitySchema.scheme) schema.scheme = securitySchema.scheme;
    else throw new Error('Security Scheme for "http" requires scheme');

    if (securitySchema.bearerFormat)
      schema.bearerFormat = securitySchema.bearerFormat;

    return schema;
  }

  createOpenIDConnectScheme(securitySchema) {
    const schema = {};
    if (securitySchema.openIdConnectUrl)
      schema.openIdConnectUrl = securitySchema.openIdConnectUrl;
    else
      throw new Error(
        'Security Scheme for "openIdConnect" requires openIdConnectUrl'
      );

    return schema;
  }

  createOAuth2Scheme(securitySchema) {
    const schema = {};
    if (securitySchema.flows) {
      const flows = this.createOAuthFlows(securitySchema.flows);
      Object.assign(schema, { flows: flows });
    } else throw new Error('Security Scheme for "oauth2" requires flows');

    return schema;
  }

  createOAuthFlows(flows) {
    const obj = {};
    for (const flow of Object.keys(flows)) {
      const schema = {};
      if (["implicit", "authorizationCode"].includes(flow))
        if (flows[flow].authorizationUrl)
          schema.authorizationUrl = flows[flow].authorizationUrl;
        else
          throw new Error(`oAuth2 ${flow} flow requires an authorizationUrl`);

      if (
        ["password", "clientCredentials", "authorizationCode"].includes(flow)
      ) {
        if (flows[flow].tokenUrl) schema.tokenUrl = flows[flow].tokenUrl;
        else throw new Error(`oAuth2 ${flow} flow requires a tokenUrl`);
      }

      if (flows[flow].refreshUrl) schema.refreshUrl = flows[flow].refreshUrl;

      if (flows[flow].scopes) schema.scopes = flows[flow].scopes;
      else throw new Error(`oAuth2 ${flow} flow requires scopes`);

      Object.assign(obj, { [flow]: schema });
    }
    return obj;
  }

  createExamples(examples) {
    const examplesObj = {};

    for (const example of examples) {
      const { name, ...partialExample } = example;
      const componentName = this.addToComponents(
        "examples",
        partialExample,
        example.name
      );

      Object.assign(examplesObj, {
        [example.name]: { $ref: `#/components/examples/${componentName}` },
      });
    }

    return examplesObj;
  }

  cleanupLinks() {
    for (const path of Object.keys(this.openAPI.paths)) {
      for (const [name, value] of Object.entries(this.openAPI.paths[path])) {
        if (
          RegExp(/(get|put|post|delete|options|head|patch|trace)/i).test(name)
        ) {
          for (const [statusCode, responseObj] of Object.entries(
            value?.responses
          )) {
            if (responseObj.links) {
              for (const [linkName, linkObj] of Object.entries(
                responseObj.links
              )) {
                const opId = linkObj.operationId;
                if (this.functionMap[opId]) {
                  linkObj.operationId = this.functionMap[opId][0];
                }
              }
            }
          }
        }
      }
    }
  }

  extendSpecification(spec) {
    const obj = {};
    for (const key of Object.keys(spec)) {
      if (/^[x\-]/i.test(key)) {
        Object.assign(obj, { [key]: spec[key] });
      }
    }

    return obj;
  }

  getHTTPFunctions() {
    const isHttpFunction = (funcType) => {
      const keys = Object.keys(funcType);
      if (
        keys.includes(this.httpKeys.http) ||
        keys.includes(this.httpKeys.httpAPI)
      )
        return true;
    };

    const functionNames = this.serverless.service.getAllFunctions();

    return functionNames
      .map((functionName) => {
        return this.serverless.service.getFunction(functionName);
      })
      .filter((functionType) => {
        if (functionType?.events.some(isHttpFunction)) return functionType;
      })
      .map((functionType) => {
        const event = functionType.events.filter(isHttpFunction);
        const operationName = functionType.name.split("-").slice(-1).pop();

        Object.assign(this.functionMap, {
          [operationName]: [],
        });

        return {
          operationName: operationName,
          functionInfo: functionType,
          handler: functionType.handler,
          name: functionType.name,
          event,
        };
      });
  }

  async validate() {
    const config = await createConfig({
      apis: {},
      // styleguide: {
      rules: {
        spec: "error",
        "path-parameters-defined": "error",
        "operation-2xx-response": "error",
        "operation-4xx-response": "error",
        "operation-operationId-unique": "error",
        "path-declaration-must-exist": "error",
      },
      // },
    });

    const apiDesc = stringifyYaml(this.openAPI);

    const results = await lintFromString({
      source: apiDesc,
      config: config,
    }).catch((err) => {
      console.error(err);
      throw err;
    });

    if (results.length) {
      throw results;
    }

    return true;
  }
}

module.exports = DefinitionGenerator;
