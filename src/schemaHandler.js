'use strict'

const path = require('path')

const $RefParser = require("@apidevtools/json-schema-ref-parser")
const SchemaConvertor = require('json-schema-for-openapi')

class SchemaHandler {
    constructor(serverless, openAPI) {
        this.documentation = serverless.service.custom.documentation
        this.openAPI = openAPI

        this.__standardiseModels()

        try {
            this.refParserOptions = require(path.resolve('options', 'ref-parser.js'))
        } catch (err) {
            this.refParserOptions = {}
        }
    }

    /**
     * Standardises the models to a specific format
     */
    __standardiseModels() {
        const standardModel = (model) => {
            if (model.schema) {
                return model
            }

            const contentType = Object.keys(model.content)[0]
            model.contentType = contentType
            model.schema = model.content[contentType].schema

            return model
        }

        const standardisedModels = this.documentation?.models?.map(standardModel) || []
        const standardisedModelsList = this.documentation?.modelsList?.map(standardModel) || []

        this.models = standardisedModels.length ? standardisedModels.concat(standardisedModelsList) : standardisedModelsList
    }

    async addModelsToOpenAPI() {
        for (const model of this.models) {
            const modelName = model.name
            const modelSchema = model.schema

            const dereferencedSchema = await this.__dereferenceSchema(modelSchema)
                .catch(err => {
                    // console.error(err)
                    return modelSchema
                })

            const convertedSchemas = SchemaConvertor.convert(dereferencedSchema, modelName)

            for (const [schemaName, schemaValue] of Object.entries(convertedSchemas.schemas)) {
                this.__addToComponents('schemas', schemaValue, schemaName)
            }
        }
    }



    async __dereferenceSchema(schema) {
        const bundledSchema = await $RefParser.bundle(schema, this.refParserOptions)
            .catch(err => {
                throw err
            })

        let deReferencedSchema = await $RefParser.dereference(bundledSchema, this.refParserOptions)
            .catch(err => {
                throw err
            })

        // deal with schemas that have been de-referenced poorly: naive
        if (deReferencedSchema?.$ref === '#') {
            const oldRef = bundledSchema.$ref
            const path = oldRef.split('/')

            const pathTitle = path[path.length - 1]
            const referencedProperties = deReferencedSchema.definitions[pathTitle]

            Object.assign(deReferencedSchema, { ...referencedProperties })

            delete deReferencedSchema.$ref
            deReferencedSchema = await this.__dereferenceSchema(deReferencedSchema)
                .catch((err) => {
                    throw err
                })
        }

        return deReferencedSchema
    }

    __addToComponents(type, schema, name) {
        const schemaObj = {
            [name]: schema
        }

        if (this.openAPI?.components) {
            if (this.openAPI.components[type]) {
                Object.assign(this.openAPI.components[type], schemaObj)
            } else {
                Object.assign(this.openAPI.components, { [type]: schemaObj })
            }
        } else {
            const components = {
                components: {
                    [type]: schemaObj
                }
            }

            Object.assign(this.openAPI, components)
        }
    }
}

module.exports = SchemaHandler;
