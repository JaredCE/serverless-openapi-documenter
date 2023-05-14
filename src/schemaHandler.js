'use strict'

const SchemaConvertor = require('json-schema-for-openapi')
const $RefParser = require("@apidevtools/json-schema-ref-parser")
const isEqual = require('lodash.isequal')
const { v4: uuid } = require('uuid')

/** Class for the Schema Handler
 * @class
 */
class SchemaHandler {
    /** Create the Schema Handler
     * @param {object} documentation - The Documentation object from serverless
     * @param {string} version - The version of openAPI we're using
    */
    constructor(documentation, version) {
        this.documentation = documentation

        this.openAPI = {
            openapi: version,
            components: {
                schemas: {}
            }
        }

        this.modelNames = []
        this.modelReferences = {}

        this.__mergeModels()

        try {
            this.refParserOptions = require(path.resolve('options', 'ref-parser.js'))
        } catch (err) {
            this.refParserOptions = {}
        }
    }

    __mergeModels() {
        const massagedModels = this.documentation?.models?.map(model => {
            this.modelNames.push(model.name);

            if (model?.schema) {
                return model
            } else {
                const contentType = Object.keys(model.content)[0]

                return {
                    name: model.name,
                    description: model.description || '',
                    contentType: contentType,
                    schema: model.content[contentType].schema,
                    ...(model.examples && { examples: model.examples })
                }
            }
        }) || []

        this.documentation?.modelsList?.forEach(element => {
            this.modelNames.push(element.name)
        });

        this.models = (massagedModels.length) ? this.documentation?.modelsList?.concat(massagedModels) || massagedModels : this.documentation.modelsList;
    }

    /**
     * This function deals with the models that we already know exist and their schemas
     * @function handleSchemas
     * @async
     */
    async handleSchemas() {
        // Add the models we currently know about to the schemas component of the openAPI object
        for (const model of this.models) {
            // try and dereference each schema individually... ignore errors
            const dereferencedSchema = await this.dereferenceSchema(model.schema, true)
                .catch(() => {
                    Object.assign(this.openAPI.components.schemas, { [model.name]: model.schema })
                })

            if (dereferencedSchema !== undefined)
                Object.assign(this.openAPI.components.schemas, { [model.name]: dereferencedSchema })
        }

        // dereference the collected schemas as a whole.
        await this.dereferenceSchema(this.openAPI)
            .catch(err => {
                throw err
            })

        // We want to massage the schemas as best we can to fit the OpenAPI specifications
        for (const [schemaName, schemaValue] of Object.entries(this.openAPI.components.schemas)) {
            const convertedSchema = this.convertSchema(schemaValue, schemaName)
            for (const [newSchemaName, newSchemaValue] of Object.entries(convertedSchema.schemas)) {
                if (this.existsInComponents(newSchemaName)) {
                    this.openAPI.components.schemas[newSchemaName] = newSchemaValue
                    this.modelReferences[schemaName] = `#/components/schemas/${newSchemaName}`
                } else {
                    this.addToComponents('schemas', newSchemaValue, newSchemaName)
                }
            }
        }
    }

    /**
     * This function is for schemas that we don't know exist.
     * It'll check the name to see if we already know, otherwise it'll go through the process of creating a new schema.
     * @function createSchema
     * @async
     * @param {object} schema
     * @param {string} name
     * @returns {string}
     */
    async createSchema(schema, name) {
        if (this.existsInComponents(name)) {
            return this.modelReferences[name]
        }

        const dereferencedSchema = await this.dereferenceSchema(schema)
            .catch(err => {
                throw err
            })

        const convertedSchemas = this.convertSchema(dereferencedSchema, name)


    }

    async dereferenceSchema(schema, ignoreError = false) {
        let originalSchema = await $RefParser.bundle(schema, this.refParserOptions)
            .catch(err => {
                if (ignoreError === false) {
                    console.error(err)
                }
                throw err
            })

        let deReferencedSchema = await $RefParser.dereference(originalSchema, this.refParserOptions)
            .catch(err => {
                if (ignoreError === false) {
                    console.error(err)
                }
                throw err
            })

        // deal with schemas that have been de-referenced poorly: naive
        if (deReferencedSchema?.$ref === '#') {
            const oldRef = originalSchema.$ref
            const path = oldRef.split('/')

            const pathTitle = path[path.length - 1]
            const referencedProperties = deReferencedSchema.definitions[pathTitle]

            Object.assign(deReferencedSchema, { ...referencedProperties })

            delete deReferencedSchema.$ref
            deReferencedSchema = await this.dereferenceSchema(deReferencedSchema)
                .catch((err) => {
                    throw err
                })
        }

        return deReferencedSchema
    }

    /**
     * @function convertSchema
     * @param {object} schema - The schema we wish to convert
     * @param {string} schemaName - The name of the schema
     * @returns {Object.<string, Object.<string, object>>} The converted Schema and any newly created schemas from the conversion
     */
    convertSchema(schema, schemaName) {
        return SchemaConvertor.convert(schema, schemaName)
    }

    existsInComponents(name) {
        return Boolean(this.openAPI?.components?.schemas?.[name])
    }

    isTheSameSchema(schema, otherSchemaName) {
        return isEqual(schema, this.openAPI.components.schemas[otherSchemaName])
    }

    addToComponents(type, schema, name) {
        const schemaObj = {
            [name]: schema
        }

        Object.assign(this.openAPI.components[type], schemaObj)
    }
}

module.exports = SchemaHandler;
