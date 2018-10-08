const tests = (client) => {
  describe('Unknown versions', () => {
    const paths = [
      'foo',
      '1',
      '3',
    ];

    test.each(paths)('%s', async (version) => {
      const response = await client.get('', { headers: { 'X-Test-IIIF-Version': version } });

      expect(response.statusCode).toBe(500);
      expect(response.headers['content-type']).toBe('text/plain; charset=us-ascii');
      expect(response.body).toBe('Unknown IIIF version');
      expect(Object.keys(response.headers)).not.toEqual(expect.arrayContaining(['age', 'cache-control']));
    });
  });
};

describe('Edge', () => tests(edgeClient));
describe('Shield', () => tests(shieldClient));
