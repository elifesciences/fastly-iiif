import expect from 'expect';
import request from 'request-promise-native';

const {URLSearchParams} = require('url');

const baseUrl = 'https://iotest--iiif.elifesciences.org/';
const http = request.defaults({
    baseUrl: baseUrl,
    headers: {
        'Fastly-Debug': '1'
    },
    resolveWithFullResponse: true
});

beforeAll(() => {
    console.log('some setup will be done here');
});

const imageUri = (parts) => {
    parts = Object.assign({
        'prefix': 'lax',
        'identifier': '10627%2Felife-10627-fig1-v1.jpg',
        'region': 'full',
        'size': 'full',
        'rotation': 0,
        'quality': 'default',
        'format': 'jpg'
    }, parts);

    return `${parts['prefix']}/${parts['identifier']}/${parts['region']}/${parts['size']}/${parts['rotation']}/${parts['quality']}.${parts['format']}`;
};

describe('Image request', () => {

    const ok = (iiifParameters, ioParameters = {}) => {
        if (!ioParameters['format']) {
            ioParameters['format'] = 'pjpg';
        }

        const ioQueryParameters = new URLSearchParams(ioParameters);

        expect.assertions(2);

        return http.get(imageUri(iiifParameters))
            .then((response) => {
                expect(response.statusCode).toBe(200);
                expect(response.headers['x-fastly-io-url']).toBe(`/lax/10627%2Felife-10627-fig1-v1.jpg?${ioQueryParameters.toString()}`);
            });
    };

    const badRequest = (iiifParameters) => {
        expect.assertions(1);

        return http.get(imageUri(iiifParameters))
            .catch((exception) => expect(exception).toHaveProperty('statusCode', 400));
    };

    describe('Region', () => {

        describe('Supported', () => {

            test.each([
                [
                    'full'
                ]
            ])('%s', (value) => ok({'size': value}));

        });

        describe('Unsupported', () => {

            test.each([
                [
                    'square'
                ],
                [
                    '0,0,100,100'
                ],
                [
                    '100,100,100,100'
                ],
                [
                    'pct:1,2,3,4'
                ]
            ])('%s', (name) => badRequest({'region': name}));

        });

        describe('Invalid', () => {

            test.each([
                [
                    '-1,-1,100,100'
                ],
                [
                    '0,0,-1,-1'
                ],
                [
                    'pct:1'
                ],
                [
                    'pct:1,2'
                ],
                [
                    'pct:1,2,3'
                ],
                [
                    'pct:1,2,3,0'
                ],
                [
                    'foo'
                ]
            ])('%s', (name) => badRequest({'quality': name}));
        });

    });

    describe('Size', () => {

        describe('Supported', () => {

            test.each([
                [
                    'full'
                ]
            ])('%s', (value) => ok({'size': value}));

        });

        describe('Unsupported', () => {

            test.each([
                [
                    'max'
                ],
                [
                    '100,'
                ],
                [
                    ',100'
                ],
                [
                    '100,100'
                ],
                [
                    '!100,100'
                ],
                [
                    'pct:50'
                ],
                [
                    'pct:100'
                ],
                [
                    '!1'
                ],
                [
                    '!90'
                ]
            ])('%s', (name) => badRequest({'quality': name}));

        });

        describe('Invalid', () => {

            test.each([
                [
                    '0,0'
                ],
                [
                    '-1,-1'
                ],
                [
                    'pct:0'
                ],
                [
                    'pct:101'
                ],
                [
                    'foo'
                ]
            ])('%s', (name) => badRequest({'quality': name}));

        });

    });

    describe('Rotation', () => {

        describe('Supported', () => {

            test.each([
                [
                    '0'
                ]
            ])('%s', (value) => ok({'rotation': value}));

        });

        describe('Unsupported', () => {

            test.each([
                [
                    '90'
                ],
                [
                    '180'
                ],
                [
                    '270'
                ],
                [
                    '360'
                ],
                [
                    '1'
                ],
                [
                    '1.5'
                ],
                [
                    '!0'
                ],
                [
                    '!1'
                ],
                [
                    '!1.5'
                ],
                [
                    '!90'
                ]
            ])('%s', (name) => badRequest({'quality': name}));

        });

        describe('Invalid', () => {

            test.each([
                [
                    '-0'
                ],
                [
                    '-90'
                ],
                [
                    'foo'
                ]
            ])('%s', (name) => badRequest({'quality': name}));

        });

    });

    describe('Quality', () => {

        describe('Supported', () => {

            test.each([
                [
                    'default'
                ]
            ])('%s', (name) => ok({'quality': name}));

        });

        describe('Unsupported', () => {

            test.each([
                [
                    'color'
                ],
                [
                    'gray'
                ],
                [
                    'bitonal'
                ]
            ])('%s', (name) => badRequest({'quality': name}));

        });

        describe('Invalid', () => {

            test.each([
                [
                    'foo'
                ]
            ])('%s', (name) => badRequest({'quality': name}));

        });

    });

    describe('Format', () => {

        describe('Supported', () => {

            test.each([
                [
                    'jpg',
                    'pjpg'
                ]
            ])('%s', (extension, format) => ok({'format': extension}, {'format': format}));

        });

        describe('Unsupported', () => {

            test.each([
                [
                    'gif'
                ],
                [
                    'jp2'
                ],
                [
                    'pdf'
                ],
                [
                    'png'
                ],
                [
                    'tif'
                ],
                [
                    'webp'
                ]
            ])('%s', (extension) => badRequest({'format': extension}));

        });

        describe('Invalid', () => {

            test.each([
                [
                    'foo'
                ]
            ])('%s', (extension) => badRequest({'format': extension}));

        });

    });

});

describe('Info request', () => {

    test.each([
        [
            'lax/10627%2Felife-10627-fig1-v1.jpg',
            {
                'width': 4473,
                'height': 2241
            }
        ],
        [
            'journal-cms/subjects%2F2018-03%2Felife-sciences-physics-living-systems-illustration.jpg',
            {
                'width': 7016,
                'height': 2082
            }
        ]
    ])('%s/info.json', (path, json) => {
        json = Object.assign({
            '@context': 'http://iiif.io/api/image/2/context.json',
            '@id': baseUrl.concat(path),
            'protocol': 'http://iiif.io/api/image',
            'profile': [
                'http://iiif.io/api/image/2/level0.json',
                {
                    'formats': [
                        'jpg'
                    ]
                }
            ]
        }, json);

        expect.assertions(2);

        return http.get(`${path}/info.json`)
            .then((response) => {
                expect(response.statusCode).toBe(200);
                expect(JSON.parse(response.body)).toEqual(json);
            });
    });

});
