import fs from 'promise-fs';
import pathTool from 'path';
import request from 'request-promise-native';
import uuid from 'uuid/v1';

const { URLSearchParams } = require('url');

const api = request.defaults({
  baseUrl: `https://api.fastly.com/service/${process.env.FASTLY_SERVICE_ID}/`,
  headers: {
    Accept: 'application/json',
    'Fastly-Key': process.env.FASTLY_API_KEY,
  },
});

const domain = process.env.FASTLY_DOMAIN;
const baseUrl = `https://${domain}`;
const http = request.defaults({
  baseUrl,
  headers: {
    'Fastly-Debug': '1',
    'X-Test-Run': uuid(),
  },
  resolveWithFullResponse: true,
  simple: false,
});

const root = pathTool.resolve(__dirname, '../');

beforeAll(async () => {
  const version = await api.post('version')
    .then(response => JSON.parse(response).number);

  await Promise.all([
    api.post(`version/${version}/backend`).form({
      hostname: `${process.env.S3_BUCKET_NAME}.s3.amazonaws.com`,
      name: 'bucket',
      shield: 'dca-dc-us',
    }),
    api.post(`version/${version}/condition`).form({
      name: 'cats-prefix',
      statement: 'req.http.X-IIIF-Prefix == "kittehs"',
      type: 'REQUEST',
    }).then(() => api.post(`version/${version}/header`).form({
      name: 'cats-prefix',
      type: 'request',
      request_condition: 'cats-prefix',
      action: 'set',
      dst: 'url',
      src: '"/cats/" req.http.X-IIIF-Identifier "?" req.url.qs',
    })),
    api.post(`version/${version}/domain`).form({
      name: domain,
    }),
    api.post(`version/${version}/header`).form({
      name: 'vary-test-run',
      type: 'cache',
      action: 'append',
      dst: 'http.Vary',
      src: '"X-Test-Run"',
    }),
    api.post(`version/${version}/snippet`).form({
      name: 'IIIF config',
      dynamic: 0,
      type: 'init',
      content: `
sub iiif_config {

  set req.http.X-IIIF-Version = if(req.http.X-Test-IIIF-Version, req.http.X-Test-IIIF-Version, "2");

}
`,
    }),
    fs.readFile(`${root}/iiif.vcl`)
      .then((contents) => {
        api.post(`version/${version}/vcl`).form({
          name: 'IIIF',
          content: contents,
          main: true,
        });
      }),
  ]);

  return api.put(`version/${version}/activate`);
});

const imageUri = (originalParts) => {
  const parts = Object.assign({
    prefix: '',
    identifier: 'pug-life.jpg',
    region: 'full',
    size: 'full',
    rotation: 0,
    quality: 'default',
    format: 'jpg',
  }, originalParts);

  return `${parts.prefix}/${parts.identifier}/${parts.region}/${parts.size}/${parts.rotation}/${parts.quality}.${parts.format}`;
};

describe('Image request', () => {
  const ok = async (iiifParameters, requestedIoParameters = {}, method = 'GET') => {
    const ioParameters = Object.assign({
      format: 'pjpg',
    }, requestedIoParameters);

    const ioQueryParameters = new URLSearchParams(ioParameters);

    const response = await http({ method, uri: imageUri(iiifParameters) });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-fastly-io-url']).toBe(`/pug-life.jpg?${ioQueryParameters.toString()}`);
  };

  const error = async (iiifParameters, statusCode, method = 'GET') => {
    const response = await http({ method, uri: imageUri(iiifParameters) });

    expect(response.statusCode).toBe(statusCode);
  };

  const badRequest = iiifParameters => error(iiifParameters, 400);

  describe('Methods', () => {
    describe('Supported', () => {
      const methods = [
        'GET',
        'HEAD',
      ];

      test.each(methods)('%s', method => ok({}, {}, method));
    });

    describe('Unsupported', () => {
      const methods = [
        'DELETE',
        'OPTIONS',
        'PATCH',
        'POST',
        'PUT',
        'TRACE',
      ];

      test.each(methods)('%s', method => error({}, 405, method));
    });

    describe('Invalid', () => {
      const methods = [
        'FOO',
      ];

      test.each(methods)('%s', method => error({}, 405, method));
    });
  });

  describe('Region', () => {
    describe('Supported', () => {
      const regions = [
        'full',
      ];

      test.each(regions)('%s', region => ok({ region }));
    });

    describe('Unsupported', () => {
      const regions = [
        'square',
        '0,0,100,100',
        '100,100,100,100',
        'pct:1,2,3,4',
      ];

      test.each(regions)('%s', region => badRequest({ region }));
    });

    describe('Invalid', () => {
      const regions = [
        '-1,-1,100,100',
        '0,0,-1,-1',
        'pct:1,2',
        'pct:1,2,3',
        'pct:1,2,3,0',
        'foo',
      ];

      test.each(regions)('%s', region => badRequest({ region }));
    });
  });

  describe('Size', () => {
    describe('Supported', () => {
      const sizes = [
        'full',
      ];

      test.each(sizes)('%s', size => ok({ size }));
    });

    describe('Unsupported', () => {
      const sizes = [
        'max',
        '100,',
        ',100',
        '100,100',
        '!100,100',
        'pct:50',
        'pct:100',
        '!1',
        '!90',
      ];

      test.each(sizes)('%s', size => badRequest({ size }));
    });

    describe('Invalid', () => {
      const sizes = [
        '0,0',
        '-1,-1',
        'pct:0',
        'pct:101',
        'foo',
      ];

      test.each(sizes)('%s', size => badRequest({ size }));
    });
  });

  describe('Rotation', () => {
    describe('Supported', () => {
      const rotations = [
        '0',
      ];

      test.each(rotations)('%s', rotation => ok({ rotation }));
    });

    describe('Unsupported', () => {
      const rotations = [
        '90',
        '180',
        '270',
        '360',
        '1',
        '1.5',
        '!0',
        '!1',
        '!1.5',
        '!90',
      ];

      test.each(rotations)('%s', rotation => badRequest({ rotation }));
    });

    describe('Invalid', () => {
      const rotations = [
        '-0',
        '-90',
        'foo',
      ];

      test.each(rotations)('%s', rotation => badRequest({ rotation }));
    });
  });

  describe('Quality', () => {
    describe('Supported', () => {
      const qualities = [
        'default',
      ];

      test.each(qualities)('%s', quality => ok({ quality }));
    });

    describe('Unsupported', () => {
      const qualities = [
        'bitonal',
        'color',
        'gray',
      ];

      test.each(qualities)('%s', quality => badRequest({ quality }));
    });

    describe('Invalid', () => {
      const qualities = [
        'foo',
      ];

      test.each(qualities)('%s', quality => badRequest({ quality }));
    });
  });

  describe('Format', () => {
    describe('Supported', () => {
      const formats = {
        jpg: 'pjpg',
      };

      test.each(Object.entries(formats))('%s', (iiifFormat, ioFormat) => ok({ format: iiifFormat }, { format: ioFormat }));
    });

    describe('Unsupported', () => {
      const formats = [
        'gif',
        'jp2',
        'pdf',
        'png',
        'tif',
        'webp',
      ];

      test.each(formats)('%s', format => badRequest({ format }));
    });

    describe('Invalid', () => {
      const formats = [
        'foo',
      ];

      test.each(formats)('%s', format => badRequest({ format }));
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
      '@id': baseUrl.concat(prefix, '/', identifier),
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
  });
});

describe('Unknown images', () => {
  const paths = [
    'foo.jpg/info.json',
    'foo.jpg/full/full/0/default.jpg',
  ];

  test.each(paths)('%s', async (path) => {
    const response = await http.get(path);

    expect(response.statusCode).toBe(404);
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
  });
});

describe('Unknown versions', () => {
  const paths = [
    'foo',
    '1',
    '3',
  ];

  test.each(paths)('%s', async (version) => {
    const response = await http.get(imageUri(), { headers: { 'X-Test-IIIF-Version': version } });

    expect(response.statusCode).toBe(500);
  });
});
