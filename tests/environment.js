const NodeEnvironment = require('jest-environment-node');
const request = require('request-promise-native');
const uuid = require('uuid/v1');

class FastlyEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();

    const domain = process.env.FASTLY_DOMAIN;
    const baseUrl = `http://${domain}`;
    const headers = () => ({
      'Fastly-Debug': '1',
      Host: domain,
      'X-Test-Run': uuid(),
    });

    // Shield client.
    this.global.shieldClient = request.defaults({
      baseUrl: 'http://cache-dca17744.hosts.fastly.net',
      headers: headers(),
      resolveWithFullResponse: true,
      simple: false,
    });

    // Edge client.
    this.global.edgeClient = request.defaults({
      baseUrl: 'http://cache-iad2120.hosts.fastly.net',
      headers: headers(),
      resolveWithFullResponse: true,
      simple: false,
    });

    this.global.baseUrl = baseUrl;
  }
}

module.exports = FastlyEnvironment;
