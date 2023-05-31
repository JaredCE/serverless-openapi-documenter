'use strict'

const expect = require('chai').expect
const nock = require('nock')

const owasp = require('../../src/owasp')

const owaspJSON = require('../../json/owasp.json')
const newOWASPJSON = require('../json/newOWASP.json')

describe(`owasp`, function () {
    describe(`getLatest`, function () {
        it(`populates the defaults from the included OWASP release when the online version can not be reached`, async function() {
            nock('https://owasp.org')
                .get('/www-project-secure-headers/ci/headers_add.json')
                .reply(404, {})

            await owasp.getLatest()
                .catch(err => {
                    console.error(err)
                    expect(err).to.be.undefined
                })

            expect(owasp.DEFAULT_OWASP_HEADERS['Permissions-Policy']).to.have.property('schema')
            const permissionsPolicyDefault = owaspJSON.headers.filter(obj => obj.name === 'Permissions-Policy')
            expect(owasp.DEFAULT_OWASP_HEADERS['Permissions-Policy'].schema.default).to.be.equal(permissionsPolicyDefault[0].value)
            expect(Object.keys(owasp.DEFAULT_OWASP_HEADERS).length).to.be.equal(13)
        });

        it(`populates the defaults with information from a new OWASP release`, async function() {
            nock('https://owasp.org')
                .get('/www-project-secure-headers/ci/headers_add.json')
                .reply(200, newOWASPJSON)

            await owasp.getLatest()
                .catch(err => {
                    console.error(err)
                    expect(err).to.be.undefined
                })

            expect(owasp.DEFAULT_OWASP_HEADERS['Cross-Origin-Embedder-Policy']).to.have.property('schema')
            const newCrossOriginEmbedderPolicy = newOWASPJSON.headers.filter(obj => obj.name === 'Cross-Origin-Embedder-Policy')
            expect(owasp.DEFAULT_OWASP_HEADERS['Cross-Origin-Embedder-Policy'].schema.default).to.be.equal(newCrossOriginEmbedderPolicy[0].value)
            expect(Object.keys(owasp.DEFAULT_OWASP_HEADERS).length).to.be.equal(13)
        });

        it(`does not remove any defaults not contained in a new release`, async function() {
            const newOWASPJSONMissing = JSON.parse(JSON.stringify(newOWASPJSON))

            const headers = newOWASPJSONMissing.headers.filter(obj => obj.name !== 'Pragma')
            newOWASPJSONMissing.headers = headers

            nock('https://owasp.org')
                .get('/www-project-secure-headers/ci/headers_add.json')
                .reply(200, newOWASPJSONMissing)

            await owasp.getLatest()
                .catch(err => {
                    console.error(err)
                    expect(err).to.be.undefined
                })

            expect(owasp.DEFAULT_OWASP_HEADERS).to.have.property('Pragma')
            expect(Object.keys(owasp.DEFAULT_OWASP_HEADERS).length).to.be.equal(13)
        });

        it(`adds any properties contained in a new release`, async function() {
            const newOWASPJSONAdded = JSON.parse(JSON.stringify(newOWASPJSON))
            newOWASPJSONAdded.headers.push({name: 'x-added', value: 'true'})

            nock('https://owasp.org')
                .get('/www-project-secure-headers/ci/headers_add.json')
                .reply(200, newOWASPJSONAdded)

            await owasp.getLatest()
                .catch(err => {
                    console.error(err)
                    expect(err).to.be.undefined
                })

            expect(owasp.DEFAULT_OWASP_HEADERS).to.have.property('x-added')
            expect(owasp.DEFAULT_OWASP_HEADERS['x-added']).to.have.property('schema')
            expect(owasp.DEFAULT_OWASP_HEADERS['x-added'].schema.default).to.be.equal('true')
            expect(Object.keys(owasp.DEFAULT_OWASP_HEADERS).length).to.be.equal(14)
        });
    });

    describe(`getHeaders`, function () {
        it(`brings back default headers from a list`, function() {
            const headerOptions = {cacheControl: true, xFrameOptions: true}
            const headers = owasp.getHeaders(headerOptions)

            expect(Object.keys(headers).length).to.be.equal(2)
        });

        it(`brings back default headers from a list with new schema defaults when values are provided`, function() {
            const headerOptions = {
                referrerPolicy: {
                    value: 'true'
                },
                crossOriginOpenerPolicy: {
                    value: 'strict'
                }
            }

            const headers = owasp.getHeaders(headerOptions)

            expect(Object.keys(headers).length).to.be.equal(2)

            expect(headers['Cross-Origin-Opener-Policy'].schema.default === 'strict')
        });
    });
});
