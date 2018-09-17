import fs from 'promise-fs';
import pathTool from 'path';
import retry from 'p-retry';
import request from 'request-promise-native';
import uuid from 'uuid/v1';

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
  headers: {
    'Fastly-Debug': '1',
    'X-Test-Run': uuid(),
  },
  resolveWithFullResponse: true,
  simple: false,
});

beforeAll(async () => {
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
});

const createImageUri = ({
  prefix = '',
  identifier = 'pug-life.jpg',
  region = 'full',
  size = 'full',
  rotation = 0,
  quality = 'default',
  format = 'jpg',
} = {}) => `${prefix}/${identifier}/${region}/${size}/${rotation}/${quality}.${format}`;

describe('Image request', () => {
  describe('HTTP methods', () => {
    const supported = ['GET', 'HEAD'];
    const unsupported = ['DELETE', 'OPTIONS', 'PATCH', 'POST', 'PUT', 'TRACE'];
    const invalid = ['FOO'];

    describe('Supported values', () => {
      test.each(supported)('%s', async (method) => {
        const response = await http({ method, uri: createImageUri() });

        expect(response.statusCode).toBe(200);
        expect(response.headers['x-fastly-io-url']).toBe('/pug-life.jpg?format=pjpg');
      });
    });

    describe('Unsupported values', () => {
      test.each(unsupported)('%s', async (method) => {
        const response = await http({ method, uri: createImageUri() });

        expect(response.statusCode).toBe(405);
        expect(response.body).toBe('Not a IIIF method');
      });
    });

    describe('Invalid values', () => {
      test.each(invalid)('%s', async (method) => {
        const response = await http({ method, uri: createImageUri() });

        expect(response.statusCode).toBe(405);
        expect(response.body).toBe('Not a IIIF method');
      });
    });
  });

  describe('Region parameter', () => {
    const supported = [
      ['full', '/pug-life.jpg?format=pjpg'],
    ];
    const unsupported = ['square', '0,0,100,100', '100,100,100,100', 'pct:0,0,1,1', 'pct:0,0,0.01,0.01', 'pct:0.0,0.0,100.0,100.0', 'pct:99.99,99.99,100.00,100.00'];
    const invalid = ['-1,-1,100,100', '0,0,-1,-1', '1,1,0,0', 'pct:00,00,1,1', 'pct:0,0,01,01', 'pct:1', 'pct:1,2', 'pct:1,2,3', 'pct:1,2,3,0', 'pct:100,100,100,100', 'pct:-1,-1,-1,-1', 'pct:0,0,0,0', 'pct:0.,0.,100.,100.', 'foo'];

    describe('Supported values', () => {
      test.each(supported)('%s', async (region, expected) => {
        const response = await http({ uri: createImageUri({ region }) });

        expect(response.statusCode).toBe(200);
        expect(response.headers['x-fastly-io-url']).toBe(expected);
      });
    });

    describe('Unsupported values', () => {
      test.each(unsupported)('%s', async (region) => {
        const response = await http({ uri: createImageUri({ region }) });

        expect(response.statusCode).toBe(400);
        expect(response.body).toBe('Unsupported region parameter');
      });
    });

    describe('Invalid values', () => {
      test.each(invalid)('%s', async (region) => {
        const response = await http({ uri: createImageUri({ region }) });

        expect(response.statusCode).toBe(400);
        expect(response.body).toBe('Invalid region parameter');
      });
    });
  });

  describe('Size parameter', () => {
    const supported = [
      ['full', '/pug-life.jpg?format=pjpg'],
    ];
    const unsupported = ['max', '1,', ',1', '1,1', '!1,1', 'pct:0.001', 'pct:50', 'pct:100', 'pct:100.00'];
    const invalid = ['0,', '1.0', '01,', ',0', ',1.0', ',01', '0,0', '1.0,1.0', '-1,-1', '!0,0', '!1.0,1.0', 'pct:0', 'pct:1.', 'ptc:50.0', 'pct: 100.001', 'pct:101', 'foo'];

    describe('Supported values', () => {
      test.each(supported)('%s', async (size, expected) => {
        const response = await http({ uri: createImageUri({ size }) });

        expect(response.statusCode).toBe(200);
        expect(response.headers['x-fastly-io-url']).toBe(expected);
      });
    });

    describe('Unsupported values', () => {
      test.each(unsupported)('%s', async (size) => {
        const response = await http({ uri: createImageUri({ size }) });

        expect(response.statusCode).toBe(400);
        expect(response.body).toBe('Unsupported size parameter');
      });
    });

    describe('Invalid values', () => {
      test.each(invalid)('%s', async (size) => {
        const response = await http({ uri: createImageUri({ size }) });

        expect(response.statusCode).toBe(400);
        expect(response.body).toBe('Invalid size parameter');
      });
    });
  });

  describe('Rotation parameter', () => {
    const supported = [
      ['0', '/pug-life.jpg?format=pjpg'],
    ];
    const unsupported = ['90', '180', '270', '359.999', '360', '360.00', '0.001', '!0', '!1', '!0.001', '!90'];
    const invalid = ['1.', '360.001', '361', '-0', '-90', 'foo'];

    describe('Supported values', () => {
      test.each(supported)('%s', async (rotation, expected) => {
        const response = await http({ uri: createImageUri({ rotation }) });

        expect(response.statusCode).toBe(200);
        expect(response.headers['x-fastly-io-url']).toBe(expected);
      });
    });

    describe('Unsupported values', () => {
      test.each(unsupported)('%s', async (rotation) => {
        const response = await http({ uri: createImageUri({ rotation }) });

        expect(response.statusCode).toBe(400);
        expect(response.body).toBe('Unsupported rotation parameter');
      });
    });

    describe('Invalid values', () => {
      test.each(invalid)('%s', async (rotation) => {
        const response = await http({ uri: createImageUri({ rotation }) });

        expect(response.statusCode).toBe(400);
        expect(response.body).toBe('Invalid rotation parameter');
      });
    });
  });

  describe('Quality parameter', () => {
    const supported = [
      ['default', '/pug-life.jpg?format=pjpg'],
    ];
    const unsupported = ['bitonal', 'color', 'gray'];
    const invalid = ['foo'];

    describe('Supported values', () => {
      test.each(supported)('%s', async (quality, expected) => {
        const response = await http({ uri: createImageUri({ quality }) });

        expect(response.statusCode).toBe(200);
        expect(response.headers['x-fastly-io-url']).toBe(expected);
      });
    });

    describe('Unsupported values', () => {
      test.each(unsupported)('%s', async (quality) => {
        const response = await http({ uri: createImageUri({ quality }) });

        expect(response.statusCode).toBe(400);
        expect(response.body).toBe('Unsupported quality parameter');
      });
    });

    describe('Invalid values', () => {
      test.each(invalid)('%s', async (quality) => {
        const response = await http({ uri: createImageUri({ quality }) });

        expect(response.statusCode).toBe(400);
        expect(response.body).toBe('Invalid quality parameter');
      });
    });
  });

  describe('Format parameter', () => {
    const supported = [
      ['jpg', '/pug-life.jpg?format=pjpg'],
    ];
    const unsupported = ['gif', 'jp2', 'pdf', 'png', 'tif', 'webp'];
    const invalid = ['foo'];

    describe('Supported values', () => {
      test.each(supported)('%s', async (format, expected) => {
        const response = await http({ uri: createImageUri({ format }) });

        expect(response.statusCode).toBe(200);
        expect(response.headers['x-fastly-io-url']).toBe(expected);
      });
    });

    describe('Unsupported values', () => {
      test.each(unsupported)('%s', async (format) => {
        const response = await http({ uri: createImageUri({ format }) });

        expect(response.statusCode).toBe(400);
        expect(response.body).toBe('Unsupported format parameter');
      });
    });

    describe('Invalid values', () => {
      test.each(invalid)('%s', async (format) => {
        const response = await http({ uri: createImageUri({ format }) });

        expect(response.statusCode).toBe(400);
        expect(response.body).toBe('Invalid format parameter');
      });
    });
  });
});

describe('Info request', () => {
  test.each([
    [
      '',
      'pug-life.jpg',
      {
        width: 2000,
        height: 1333,
      },
    ],
    [
      '/kittehs',
      'pop6.jpg',
      {
        width: 4288,
        height: 2848,
      },
    ],
    [
      '/kittehs',
      'more%2Fcat-manipulating.jpg',
      {
        width: 3264,
        height: 2448,
      },
    ],
  ])('%s/%s/info.json', async (prefix, identifier, requiredJson) => {
    const json = Object.assign({
      '@context': 'http://iiif.io/api/image/2/context.json',
      '@id': `${baseUrl}${prefix}/${identifier}`,
      protocol: 'http://iiif.io/api/image',
      profile: [
        'http://iiif.io/api/image/2/level0.json',
        {
          formats: [
            'jpg',
          ],
        },
      ],
    }, requiredJson);

    const response = await http.get(`${prefix}/${identifier}/info.json`);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(json);
  });
});

describe('Non-image request', () => {
  const paths = [
    'foo.txt/info.json',
    'foo.txt/full/full/0/default.jpg',
  ];

  test.each(paths)('%s', async (path) => {
    const response = await http.get(path);

    expect(response.statusCode).toBe(404);
    expect(response.body).toBe('Hidden as can\'t be processed by Fastly IO');
  });
});

describe('Unknown images', () => {
  const paths = [
    'foo.jpg/info.json',
    'foo.jpg/full/full/0/default.jpg',
  ];

  test.each(paths)('%s', async (path) => {
    const response = await http.get(path);

    expect(response.statusCode).toBe(403); // Set by backend
    expect(response.body).toBe('Forbidden');
  });
});

describe('Unknown paths', () => {
  const paths = [
    '',
    'foo',
    'foo.jpg',
    'foo.jpg/full/0/default.jpg',
    'foo.jpg/full/full/0/default',
  ];

  test.each(paths)('%s', async (path) => {
    const response = await http.get(path);

    expect(response.statusCode).toBe(404);
    expect(response.body).toBe('Not a IIIF path');
  });
});

describe('Unknown versions', () => {
  const paths = [
    'foo',
    '1',
    '3',
  ];

  test.each(paths)('%s', async (version) => {
    const response = await http.get(createImageUri(), { headers: { 'X-Test-IIIF-Version': version } });

    expect(response.statusCode).toBe(500);
    expect(response.body).toBe('Unknown IIIF version');
  });
});
