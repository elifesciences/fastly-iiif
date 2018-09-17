const expect = require('expect');
const fs = require('promise-fs');
const pathTool = require('path');
const retry = require('p-retry');
const request = require('request-promise-native');

const setUp = async () => {
  const domain = process.env.FASTLY_DOMAIN;
  const baseUrl = `https://${domain}`;
  const root = pathTool.resolve(__dirname, '../');

  // Fastly API client.
  const api = request.defaults({
    baseUrl: `https://api.fastly.com/service/${process.env.FASTLY_SERVICE_ID}/`,
    headers: {
      Accept: 'application/json',
      'Fastly-Key': process.env.FASTLY_API_KEY,
    },
  });

  // Test client.
  const http = request.defaults({
    baseUrl,
    resolveWithFullResponse: true,
    simple: false,
  });

  // Create a new version.
  const version = await api.post('version')
    .then(response => JSON.parse(response).number);

  // Set up requests to configure the version.
  const config = [];

  // Set the backend to an S3 bucket containing test fixtures.
  config.push(api.post(`version/${version}/backend`).form({
    hostname: `${process.env.S3_BUCKET_NAME}.s3.amazonaws.com`,
    name: 'bucket',
    shield: 'dca-dc-us',
  }));

  // Set the domain.
  config.push(api.post(`version/${version}/domain`).form({
    name: domain,
  }));

  // Create a condition.
  config.push(api.post(`version/${version}/condition`).form({
    name: 'cats-prefix',
    statement: 'req.http.X-IIIF-Prefix == "kittehs"',
    type: 'REQUEST',
  })
    // Rewrite the prefix to match the bucket.
    .then(() => api.post(`version/${version}/header`).form({
      name: 'cats-prefix',
      type: 'request',
      request_condition: 'cats-prefix',
      action: 'set',
      dst: 'url',
      src: '"/cats/" req.http.X-IIIF-Identifier "?" req.url.qs',
    })));

  // Make sure all responses have 'Vary: X-Test-Run' to avoid conflicts between test runs.
  config.push(api.post(`version/${version}/header`).form({
    name: 'vary-test-run',
    type: 'cache',
    action: 'append',
    dst: 'http.Vary',
    src: '"X-Test-Run"',
  }));

  // Add 'X-Fastly-Config-Version' to responses to allow checking what's active.
  config.push(api.post(`version/${version}/header`).form({
    name: 'fastly-config-version',
    type: 'response',
    action: 'set',
    dst: 'http.X-Fastly-Config-Version',
    src: `"${version}"`,
  }));

  // Add 'iiif_config' to configure the VCL.
  config.push(api.post(`version/${version}/snippet`).form({
    name: 'IIIF config',
    dynamic: 0,
    type: 'init',
    content: `
sub iiif_config {

  set req.http.X-IIIF-Version = if(req.http.X-Test-IIIF-Version, req.http.X-Test-IIIF-Version, "2");

}
`,
  }));

  // Add the VCL.
  config.push(fs.readFile(`${root}/iiif.vcl`)
    .then((contents) => {
      api.post(`version/${version}/vcl`).form({
        name: 'IIIF',
        content: contents,
        main: true,
      });
    }));

  // Send configuration requests.
  await Promise.all(config);

  // Activate the version.
  await api.put(`version/${version}/activate`);

  // Wait for it to be deployed.
  const checkDeployed = () => http.head('')
    .then(response => expect(response.headers['x-fastly-config-version']).toBe(`${version}`));

  await retry(checkDeployed, { factor: 1, minTimeout: 2 * 1000, retries: 20 });
};

module.exports = setUp;
