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
          supports: [
            'cors',
          ],
        },
      ],
    }, requiredJson);

    const response = await http.get(`${prefix}/${identifier}/info.json`);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(json);
    expect(response.headers['access-control-allow-origin']).toBe('*');
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
    expect(response.body).toBe('Not Found');
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
