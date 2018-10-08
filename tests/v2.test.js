const createImageUri = ({
  prefix = '',
  identifier = 'pug-life.jpg',
  region = 'full',
  size = 'full',
  rotation = 0,
  quality = 'default',
  format = 'jpg',
} = {}) => `${prefix}/${identifier}/${region}/${size}/${rotation}/${quality}.${format}`;

const tests = (client) => {
  describe('Image request', () => {
    describe('HTTP methods', () => {
      const supported = ['GET', 'HEAD'];
      const unsupported = ['DELETE', 'OPTIONS', 'PATCH', 'POST', 'PUT', 'TRACE'];
      const invalid = ['FOO'];

      describe('Supported values', () => {
        test.each(supported)('%s', async (method) => {
          const response = await client({ method, uri: createImageUri() });

          expect(response.statusCode).toBe(200);
          expect(response.headers['content-type']).toBe('image/jpeg');
          expect(response.headers['x-fastly-io-url']).toBe('/pug-life.jpg?format=pjpg');
          expect(response.headers).toHaveProperty('age');
          expect(response.headers['cache-control']).toBe('max-age=3600, public');
        });
      });

      describe('Unsupported values', () => {
        test.each(unsupported)('%s', async (method) => {
          const response = await client({ method, uri: createImageUri() });

          expect(response.statusCode).toBe(405);
          expect(response.headers['content-type']).toBe('text/plain; charset=us-ascii');
          expect(response.body).toBe('Not a IIIF method');
          expect(Object.keys(response.headers)).not.toEqual(expect.arrayContaining(['age', 'cache-control']));
        });
      });

      describe('Invalid values', () => {
        test.each(invalid)('%s', async (method) => {
          const response = await client({ method, uri: createImageUri() });

          expect(response.statusCode).toBe(405);
          expect(response.headers['content-type']).toBe('text/plain; charset=us-ascii');
          expect(response.body).toBe('Not a IIIF method');
          expect(Object.keys(response.headers)).not.toEqual(expect.arrayContaining(['age', 'cache-control']));
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
          const response = await client({ uri: createImageUri({ region }) });

          expect(response.statusCode).toBe(200);
          expect(response.headers['x-fastly-io-url']).toBe(expected);
          expect(response.headers).toHaveProperty('age');
          expect(response.headers['cache-control']).toBe('max-age=3600, public');
        });
      });

      describe('Unsupported values', () => {
        test.each(unsupported)('%s', async (region) => {
          const response = await client({ uri: createImageUri({ region }) });

          expect(response.statusCode).toBe(400);
          expect(response.headers['content-type']).toBe('text/plain; charset=us-ascii');
          expect(response.body).toBe('Unsupported region parameter');
          expect(Object.keys(response.headers)).not.toEqual(expect.arrayContaining(['age', 'cache-control']));
        });
      });

      describe('Invalid values', () => {
        test.each(invalid)('%s', async (region) => {
          const response = await client({ uri: createImageUri({ region }) });

          expect(response.statusCode).toBe(400);
          expect(response.headers['content-type']).toBe('text/plain; charset=us-ascii');
          expect(response.body).toBe('Invalid region parameter');
          expect(Object.keys(response.headers)).not.toEqual(expect.arrayContaining(['age', 'cache-control']));
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
          const response = await client({ uri: createImageUri({ size }) });

          expect(response.statusCode).toBe(200);
          expect(response.headers['content-type']).toBe('image/jpeg');
          expect(response.headers['x-fastly-io-url']).toBe(expected);
          expect(response.headers).toHaveProperty('age');
          expect(response.headers['cache-control']).toBe('max-age=3600, public');
        });
      });

      describe('Unsupported values', () => {
        test.each(unsupported)('%s', async (size) => {
          const response = await client({ uri: createImageUri({ size }) });

          expect(response.statusCode).toBe(400);
          expect(response.headers['content-type']).toBe('text/plain; charset=us-ascii');
          expect(response.body).toBe('Unsupported size parameter');
          expect(Object.keys(response.headers)).not.toEqual(expect.arrayContaining(['age', 'cache-control']));
        });
      });

      describe('Invalid values', () => {
        test.each(invalid)('%s', async (size) => {
          const response = await client({ uri: createImageUri({ size }) });

          expect(response.statusCode).toBe(400);
          expect(response.headers['content-type']).toBe('text/plain; charset=us-ascii');
          expect(response.body).toBe('Invalid size parameter');
          expect(Object.keys(response.headers)).not.toEqual(expect.arrayContaining(['age', 'cache-control']));
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
          const response = await client({ uri: createImageUri({ rotation }) });

          expect(response.statusCode).toBe(200);
          expect(response.headers['content-type']).toBe('image/jpeg');
          expect(response.headers['x-fastly-io-url']).toBe(expected);
          expect(response.headers).toHaveProperty('age');
          expect(response.headers['cache-control']).toBe('max-age=3600, public');
        });
      });

      describe('Unsupported values', () => {
        test.each(unsupported)('%s', async (rotation) => {
          const response = await client({ uri: createImageUri({ rotation }) });

          expect(response.statusCode).toBe(400);
          expect(response.headers['content-type']).toBe('text/plain; charset=us-ascii');
          expect(response.body).toBe('Unsupported rotation parameter');
          expect(Object.keys(response.headers)).not.toEqual(expect.arrayContaining(['age', 'cache-control']));
        });
      });

      describe('Invalid values', () => {
        test.each(invalid)('%s', async (rotation) => {
          const response = await client({ uri: createImageUri({ rotation }) });

          expect(response.statusCode).toBe(400);
          expect(response.headers['content-type']).toBe('text/plain; charset=us-ascii');
          expect(response.body).toBe('Invalid rotation parameter');
          expect(Object.keys(response.headers)).not.toEqual(expect.arrayContaining(['age', 'cache-control']));
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
          const response = await client({ uri: createImageUri({ quality }) });

          expect(response.statusCode).toBe(200);
          expect(response.headers['x-fastly-io-url']).toBe(expected);
          expect(response.headers).toHaveProperty('age');
          expect(response.headers['cache-control']).toBe('max-age=3600, public');
        });
      });

      describe('Unsupported values', () => {
        test.each(unsupported)('%s', async (quality) => {
          const response = await client({ uri: createImageUri({ quality }) });

          expect(response.statusCode).toBe(400);
          expect(response.headers['content-type']).toBe('text/plain; charset=us-ascii');
          expect(response.body).toBe('Unsupported quality parameter');
          expect(Object.keys(response.headers)).not.toEqual(expect.arrayContaining(['age', 'cache-control']));
        });
      });

      describe('Invalid values', () => {
        test.each(invalid)('%s', async (quality) => {
          const response = await client({ uri: createImageUri({ quality }) });

          expect(response.statusCode).toBe(400);
          expect(response.headers['content-type']).toBe('text/plain; charset=us-ascii');
          expect(response.body).toBe('Invalid quality parameter');
          expect(Object.keys(response.headers)).not.toEqual(expect.arrayContaining(['age', 'cache-control']));
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
          const response = await client({ uri: createImageUri({ format }) });

          expect(response.statusCode).toBe(200);
          expect(response.headers['content-type']).toBe('image/jpeg');
          expect(response.headers['x-fastly-io-url']).toBe(expected);
          expect(response.headers).toHaveProperty('age');
          expect(response.headers['cache-control']).toBe('max-age=3600, public');
        });
      });

      describe('Unsupported values', () => {
        test.each(unsupported)('%s', async (format) => {
          const response = await client({ uri: createImageUri({ format }) });

          expect(response.statusCode).toBe(400);
          expect(response.headers['content-type']).toBe('text/plain; charset=us-ascii');
          expect(response.body).toBe('Unsupported format parameter');
        });
      });

      describe('Invalid values', () => {
        test.each(invalid)('%s', async (format) => {
          const response = await client({ uri: createImageUri({ format }) });

          expect(response.statusCode).toBe(400);
          expect(response.headers['content-type']).toBe('text/plain; charset=us-ascii');
          expect(response.body).toBe('Invalid format parameter');
        });
      });
    });
  });
  describe('Info request', () => {
    test.each([
      [
        '',
        'pug-instagram.jpg',
        {},
        {
          width: 1229,
          height: 922,
        },
        {
          age: undefined,
          'cache-control': 'no-cache, no-store, must-revalidate',
          'content-type': 'application/json',
        },
        [
          'surrogate-control',
        ],
      ],
      [
        '',
        'pug-life.jpg',
        {
          accept: '*/*',
        },
        {
          width: 2000,
          height: 1333,
        },
        {
          age: undefined,
          'cache-control': 'max-age=3600, public',
          'content-type': 'application/ld+json',
        },
      ],
      [
        '/kittehs',
        'pop6.jpg',
        {
          accept: 'application/xml',
        },
        {
          width: 4288,
          height: 2848,
        },
        {
          age: undefined, // TTL set in VCL
          'cache-control': 'no-store, must-revalidate, private',
          'content-type': 'application/json',
        },
      ],
      [
        '/kittehs',
        'more%2Fcat-manipulating.jpg',
        {
          accept: 'application/json, */*',
        },
        {
          width: 3264,
          height: 2448,
        },
        {
          age: undefined,
          'content-type': 'application/ld+json',
        },
        [
          'cache-control',
        ],
      ],
    ])('%s/%s/info.json', async (prefix, identifier, headers, requiredJson, requiredHeaders = {}, notHeaders = []) => {
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
            supports: [
              'cors',
              'jsonldMediaType',
            ],
          },
        ],
      }, requiredJson);

      const response = await client({ uri: `${prefix}/${identifier}/info.json`, headers });

      expect(response.statusCode).toBe(200);
      expect(response.headers.vary).toBe('Accept, X-Test-Run');
      expect(JSON.parse(response.body)).toEqual(json);
      expect(response.headers['access-control-allow-origin']).toBe('*');

      const responseHeaders = Object.keys(requiredHeaders)
        .filter(k => requiredHeaders[k] === undefined);

      const headerValues = Object.keys(requiredHeaders)
        .filter(k => requiredHeaders[k] !== undefined)
        .reduce((newObj, k) => Object.assign(newObj, { [k]: requiredHeaders[k] }), {});

      if (responseHeaders.length > 0) {
        expect(Object.keys(response.headers)).toEqual(expect.arrayContaining(responseHeaders));
      }
      if (notHeaders.length > 0) {
        expect(Object.keys(response.headers)).not.toEqual(expect.arrayContaining(notHeaders));
      }
      expect(response.headers).toMatchObject(headerValues);
    });
  });

  describe('Non-image request', () => {
    const paths = [
      'foo.txt/info.json',
      'foo.txt/full/full/0/default.jpg',
    ];

    test.each(paths)('%s', async (path) => {
      const response = await client.get(path);

      expect(response.statusCode).toBe(404);
      expect(response.headers['content-type']).toBe('text/plain; charset=us-ascii');
      expect(response.body).toBe('Not Found');
      expect(Object.keys(response.headers)).not.toEqual(expect.arrayContaining(['age', 'cache-control']));
    });
  });

  describe('Unknown images', () => {
    const paths = [
      'foo.jpg/info.json',
      'foo.jpg/full/full/0/default.jpg',
    ];

    test.each(paths)('%s', async (path) => {
      const response = await client.get(path);

      expect(response.statusCode).toBe(403); // Set by backend
      expect(response.headers['content-type']).toBe('text/plain; charset=us-ascii');
      expect(response.body).toBe('Forbidden');
      expect(Object.keys(response.headers)).not.toEqual(expect.arrayContaining(['age', 'cache-control']));
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
      const response = await client.get(path);

      expect(response.statusCode).toBe(404);
      expect(response.headers['content-type']).toBe('text/plain; charset=us-ascii');
      expect(response.body).toBe('Not a IIIF path');
      expect(Object.keys(response.headers)).not.toEqual(expect.arrayContaining(['age', 'cache-control']));
    });
  });
};

describe('Edge', () => tests(edgeClient));
describe('Shield', () => tests(shieldClient));
