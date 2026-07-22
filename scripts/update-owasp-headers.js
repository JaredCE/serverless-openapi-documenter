#!/usr/bin/env node
"use strict";

/**
 * Refreshes the bundled OWASP Secure Headers data at `json/owasp.json`.
 *
 * This runs out-of-band (locally via `npm run update:owasp` or on a schedule in
 * CI) rather than at document-generation time, so that the plugin never depends
 * on a live third-party URL when a user builds their docs. The fetched commit
 * SHA is recorded in `json/owasp.source.json` for provenance.
 *
 * Usage: node scripts/update-owasp-headers.js
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const OWNER = "OWASP";
const REPO = "www-project-secure-headers";
const BRANCH = "master";
const FILE_PATH = "ci/headers_add.json";

const RAW_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/refs/heads/${BRANCH}/${FILE_PATH}`;
const COMMITS_API = `https://api.github.com/repos/${OWNER}/${REPO}/commits?path=${encodeURIComponent(
  FILE_PATH
)}&sha=${BRANCH}&per_page=1`;

const OUTPUT_FILE = path.join(__dirname, "..", "json", "owasp.json");
const SOURCE_FILE = path.join(__dirname, "..", "json", "owasp.source.json");

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            // GitHub's API rejects requests without a User-Agent.
            "User-Agent": "serverless-openapi-documenter-owasp-updater",
            Accept: "application/vnd.github+json",
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            res.resume();
            reject(
              new Error(`Request to ${url} failed with status ${res.statusCode}`)
            );
            return;
          }

          const data = [];
          res.on("data", (chunk) => data.push(chunk));
          res.on("end", () => resolve(Buffer.concat(data).toString()));
        }
      )
      .on("error", reject);
  });
}

async function main() {
  console.log(`Fetching OWASP secure headers from ${RAW_URL}`);
  const raw = await get(RAW_URL);

  // Validate it parses before we overwrite the bundled copy.
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.headers)) {
    throw new Error(
      "Unexpected upstream format: expected a `headers` array in the response"
    );
  }

  let sha = null;
  try {
    const commits = JSON.parse(await get(COMMITS_API));
    sha = commits[0]?.sha ?? null;
  } catch (err) {
    console.warn(`Could not resolve source commit SHA: ${err.message}`);
  }

  // Re-serialize so the on-disk formatting is stable regardless of upstream
  // whitespace, which keeps CI diffs meaningful.
  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(parsed, null, 2)}\n`);

  const source = {
    url: RAW_URL,
    repo: `${OWNER}/${REPO}`,
    path: FILE_PATH,
    branch: BRANCH,
    commit: sha,
    last_update_utc: parsed.last_update_utc ?? null,
  };
  fs.writeFileSync(SOURCE_FILE, `${JSON.stringify(source, null, 2)}\n`);

  console.log(`Wrote ${OUTPUT_FILE}`);
  console.log(`Wrote ${SOURCE_FILE} (commit: ${sha ?? "unknown"})`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
