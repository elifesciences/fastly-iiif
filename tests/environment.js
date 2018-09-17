const NodeEnvironment = require('jest-environment-node');
const request = require('request-promise-native');
const uuid = require('uuid/v1');

class FastlyEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();

    const domain = process.env.FASTLY_DOMAIN;
    const baseUrl = `https://${domain}`;

    // Test client.
    this.global.http = request.defaults({
      baseUrl,
      headers: {
        'Fastly-Debug': '1',
        'X-Test-Run': uuid(),
      },
      resolveWithFullResponse: true,
      simple: false,
    });

    this.global.baseUrl = baseUrl;
  }
}

module.exports = FastlyEnvironment;
