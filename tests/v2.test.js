import expect from 'expect';
import request from 'request';

const baseUrl = 'https://iotest--iiif.elifesciences.org/';
const http = request.defaults({'baseUrl': baseUrl});

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

describe('Formats', () => {

    describe('Valid', () => {

        test.each([
            [
                'JPEG',
                'jpg'
            ]
        ])('%s', (name, extension, done) => {
            http(imageUri({'format': extension}), (error, response, body) => {
                expect(response.statusCode).toBe(200);

                done();
            });
        });

    });

    describe('Invalid', () => {

        test.each([
            [
                'PNG',
                'png'
            ],
            [
                'Unknown',
                'foo'
            ]
        ])('%s', (name, extension, done) => {
            http(imageUri({'format': extension}), (error, response, body) => {
                expect(response.statusCode).toBe(400);

                done();
            });
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
    ])('%s/info.json', (path, json, done) => {
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

        http(`${path}/info.json`, (error, response, body) => {
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(body)).toEqual(json);

            done();
        });
    });

});
