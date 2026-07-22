"use strict";

const expect = require("chai").expect;

const owasp = require("../../src/owasp");

const owaspJSON = require("../../json/owasp.json");
const newOWASPJSON = require("../json/newOWASP.json");

describe(`owasp`, function () {
  describe(`getLatest`, function () {
    it(`populates the defaults from the bundled OWASP release`, async function () {
      await owasp.getLatest().catch((err) => {
        console.error(err);
        expect(err).to.be.undefined;
      });

      expect(
        owasp.DEFAULT_OWASP_HEADERS["Permissions-Policy"]
      ).to.have.property("schema");
      const permissionsPolicyDefault = owaspJSON.headers.filter(
        (obj) => obj.name === "Permissions-Policy"
      );
      expect(
        owasp.DEFAULT_OWASP_HEADERS["Permissions-Policy"].schema.default
      ).to.be.equal(permissionsPolicyDefault[0].value);
      expect(Object.keys(owasp.DEFAULT_OWASP_HEADERS).length).to.be.equal(13);
    });
  });

  describe(`populateDefaults`, function () {
    it(`populates the defaults with information from an OWASP release`, function () {
      owasp.populateDefaults(newOWASPJSON);

      expect(
        owasp.DEFAULT_OWASP_HEADERS["Cross-Origin-Embedder-Policy"]
      ).to.have.property("schema");
      const newCrossOriginEmbedderPolicy = newOWASPJSON.headers.filter(
        (obj) => obj.name === "Cross-Origin-Embedder-Policy"
      );
      expect(
        owasp.DEFAULT_OWASP_HEADERS["Cross-Origin-Embedder-Policy"].schema
          .default
      ).to.be.equal(newCrossOriginEmbedderPolicy[0].value);
      expect(Object.keys(owasp.DEFAULT_OWASP_HEADERS).length).to.be.equal(13);
    });

    it(`adds any properties contained in a new release`, function () {
      const newOWASPJSONAdded = structuredClone(newOWASPJSON);
      newOWASPJSONAdded.headers.push({ name: "x-added", value: "true" });

      owasp.populateDefaults(newOWASPJSONAdded);

      expect(owasp.DEFAULT_OWASP_HEADERS).to.have.property("x-added");
      expect(owasp.DEFAULT_OWASP_HEADERS["x-added"]).to.have.property("schema");
      expect(owasp.DEFAULT_OWASP_HEADERS["x-added"].schema.default).to.be.equal(
        "true"
      );
      expect(Object.keys(owasp.DEFAULT_OWASP_HEADERS).length).to.be.equal(14);
    });
  });

  describe(`getHeaders`, function () {
    it(`brings back default headers from a list`, function () {
      const headerOptions = { cacheControl: true, xFrameOptions: true };
      const headers = owasp.getHeaders(headerOptions);

      expect(Object.keys(headers).length).to.be.equal(2);
    });

    it(`brings back default headers from a list with new schema defaults when values are provided`, function () {
      const headerOptions = {
        referrerPolicy: {
          value: "true",
        },
        crossOriginOpenerPolicy: {
          value: "strict",
        },
      };

      const headers = owasp.getHeaders(headerOptions);

      expect(Object.keys(headers).length).to.be.equal(2);

      expect(headers["Cross-Origin-Opener-Policy"].schema.default === "strict");
    });

    it(`handles pragma being deprecated`, function () {
      const headerOptions = {
        pragma: {
          value: "true",
        },
      };

      const headers = owasp.getHeaders(headerOptions);

      expect(Object.keys(headers).length).to.be.equal(1);

      expect(headers["Pragma"]).to.have.property("schema");
      expect(headers["Pragma"].schema).to.have.property("default", "true");
    });
  });
});
