import expect from 'expect';
import fs from 'promise-fs';
import path from 'path';
import request from 'request-promise-native';

const { URLSearchParams } = require('url');

const api = request.defaults({
  baseUrl: 'https://api.fastly.com/service/6lQpb69X5Qt9YVt2OIMiGG/',
  headers: {
    Accept: 'application/json',
    'Fastly-Key': process.env.FASTLY_API_KEY,
  },
});

const domain = 'iotest--iiif.elifesciences.org';
const baseUrl = `https://${domain}/`;
const http = request.defaults({
  baseUrl,
  headers: {
    'Fastly-Debug': '1',
  },
  resolveWithFullResponse: true,
});

const source = path.resolve(__dirname, '../src/v2');

beforeAll(async () => {
  const version = await api.post('version')
    .then(response => JSON.parse(response).number);

  const config = [
    api.post(`version/${version}/backend`).form({
      hostname: 'prod-elife-published.s3.amazonaws.com',
      name: 'bucket',
      shield: 'dca-dc-us',
    }),
    api.post(`version/${version}/domain`).form({
      name: domain,
    }),
  ];

  ['deliver', 'error', 'fetch', 'miss', 'pass', 'recv'].forEach((name) => {
    config.push(
      fs.readFile(`${source}/${name}.vcl`)
        .then((contents) => {
          api.post(`version/${version}/snippet`).form({
            name,
            dynamic: 0,
            type: name,
            content: contents,
          });
        }),
    );
  });

  return Promise.all(config)
    .then(() => api.put(`version/${version}/activate`));
});

const imageUri = (originalParts) => {
  const parts = Object.assign({
    prefix: 'articles',
    identifier: '10627%2Felife-10627-fig1-v1.jpg',
    region: 'full',
    size: 'full',
    rotation: 0,
    quality: 'default',
    format: 'jpg',
  }, originalParts);

  return `${parts.prefix}/${parts.identifier}/${parts.region}/${parts.size}/${parts.rotation}/${parts.quality}.${parts.format}`;
};

describe('Image request', () => {
  const ok = (iiifParameters, requestedIoParameters = {}) => {
    const ioParameters = Object.assign({
      format: 'pjpg',
    }, requestedIoParameters);

    const ioQueryParameters = new URLSearchParams(ioParameters);

    expect.assertions(2);

    return http.get(imageUri(iiifParameters))
      .then((response) => {
        expect(response.statusCode).toBe(200);
        expect(response.headers['x-fastly-io-url']).toBe(`/articles/10627%2Felife-10627-fig1-v1.jpg?${ioQueryParameters.toString()}`);
      });
  };

  const badRequest = (iiifParameters) => {
    expect.assertions(1);

    return http.get(imageUri(iiifParameters))
      .catch(exception => expect(exception).toHaveProperty('statusCode', 400));
  };

  describe('Region', () => {
    describe('Supported', () => {
      test.each([
        [
          'full',
        ],
      ])('%s', value => ok({ region: value }));
    });

    describe('Unsupported', () => {
      test.each([
        [
          'square',
        ],
        [
          '0,0,100,100',
        ],
        [
          '100,100,100,100',
        ],
        [
          'pct:1,2,3,4',
        ],
      ])('%s', name => badRequest({ region: name }));
    });

    describe('Invalid', () => {
      test.each([
        [
          '-1,-1,100,100',
        ],
        [
          '0,0,-1,-1',
        ],
        [
          'pct:1',
        ],
        [
          'pct:1,2',
        ],
        [
          'pct:1,2,3',
        ],
        [
          'pct:1,2,3,0',
        ],
        [
          'foo',
        ],
      ])('%s', name => badRequest({ region: name }));
    });
  });

  describe('Size', () => {
    describe('Supported', () => {
      test.each([
        [
          'full',
        ],
      ])('%s', value => ok({ size: value }));
    });

    describe('Unsupported', () => {
      test.each([
        [
          'max',
        ],
        [
          '100,',
        ],
        [
          ',100',
        ],
        [
          '100,100',
        ],
        [
          '!100,100',
        ],
        [
          'pct:50',
        ],
        [
          'pct:100',
        ],
        [
          '!1',
        ],
        [
          '!90',
        ],
      ])('%s', name => badRequest({ size: name }));
    });

    describe('Invalid', () => {
      test.each([
        [
          '0,0',
        ],
        [
          '-1,-1',
        ],
        [
          'pct:0',
        ],
        [
          'pct:101',
        ],
        [
          'foo',
        ],
      ])('%s', name => badRequest({ size: name }));
    });
  });

  describe('Rotation', () => {
    describe('Supported', () => {
      test.each([
        [
          '0',
        ],
      ])('%s', value => ok({ rotation: value }));
    });

    describe('Unsupported', () => {
      test.each([
        [
          '90',
        ],
        [
          '180',
        ],
        [
          '270',
        ],
        [
          '360',
        ],
        [
          '1',
        ],
        [
          '1.5',
        ],
        [
          '!0',
        ],
        [
          '!1',
        ],
        [
          '!1.5',
        ],
        [
          '!90',
        ],
      ])('%s', name => badRequest({ rotation: name }));
    });

    describe('Invalid', () => {
      test.each([
        [
          '-0',
        ],
        [
          '-90',
        ],
        [
          'foo',
        ],
      ])('%s', name => badRequest({ rotation: name }));
    });
  });

  describe('Quality', () => {
    describe('Supported', () => {
      test.each([
        [
          'default',
        ],
      ])('%s', name => ok({ quality: name }));
    });

    describe('Unsupported', () => {
      test.each([
        [
          'color',
        ],
        [
          'gray',
        ],
        [
          'bitonal',
        ],
      ])('%s', name => badRequest({ quality: name }));
    });

    describe('Invalid', () => {
      test.each([
        [
          'foo',
        ],
      ])('%s', name => badRequest({ quality: name }));
    });
  });

  describe('Format', () => {
    describe('Supported', () => {
      test.each([
        [
          'jpg',
          'pjpg',
        ],
      ])('%s', (extension, format) => ok({ format: extension }, { format }));
    });

    describe('Unsupported', () => {
      test.each([
        [
          'gif',
        ],
        [
          'jp2',
        ],
        [
          'pdf',
        ],
        [
          'png',
        ],
        [
          'tif',
        ],
        [
          'webp',
        ],
      ])('%s', extension => badRequest({ format: extension }));
    });

    describe('Invalid', () => {
      test.each([
        [
          'foo',
        ],
      ])('%s', extension => badRequest({ format: extension }));
    });
  });
});

describe('Info request', () => {
  test.each([
    [
      'articles/',
      '10627%2Felife-10627-fig1-v1.jpg',
      {
        width: 4473,
        height: 2241,
      },
    ],
  ])('%s/info.json', (prefix, identifier, requiredJson) => {
    const json = Object.assign({
      '@context': 'http://iiif.io/api/image/2/context.json',
      '@id': baseUrl.concat(prefix, identifier),
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

    expect.assertions(2);

    return http.get(`${prefix}${identifier}/info.json`)
      .then((response) => {
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual(json);
      });
  });
});
