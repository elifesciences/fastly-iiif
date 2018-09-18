describe('Unknown versions', () => {
  const paths = [
    'foo',
    '1',
    '3',
  ];

  test.each(paths)('%s', async (version) => {
    const response = await edgeClient.get('', { headers: { 'X-Test-IIIF-Version': version } });

    expect(response.statusCode).toBe(500);
    expect(response.body).toBe('Unknown IIIF version');
  });
});
