IIIF image API implemented using Fastly IO
==========================================

[![Build Status](https://travis-ci.org/elifesciences/fastly-iiif.svg?branch=master)](https://travis-ci.org/elifesciences/fastly-iiif)

This library provides an implementation of the [IIIF image API](https://iiif.io/) using [Fastly Image Optimizer](https://www.fastly.com/products/web-and-mobile-performance/image-optimization)

Supported versions
------------------

- [2.1](https://iiif.io/api/image/2.1/) (level 0), with:
  - Formats:
    - `jpg`
  - Features:
    - `cors`

Installation
------------

> You will need a Fastly service with VCL and image optimization enabled.

1. Create a new configuration version.
2. Set up a domain and host.
3. Upload [`iiif.vcl`](iiif.vcl) as the 'main' [custom VCL](https://docs.fastly.com/vcl/custom-vcl/uploading-custom-vcl/).
4. Upload a [configuration snippet](#configuration).
5. Add any custom settings and snippets as required.
6. Activate the version.

Configuration
-------------

The library requires a small amount of custom VCL: a subroutine called `iiif_config`.

> This can be added as a [snippet](https://docs.fastly.com/vcl/vcl-snippets/using-regular-vcl-snippets/), appended/prepended to `iiif.vcl` (either directly or as a separate [custom VCL](https://docs.fastly.com/vcl/custom-vcl/uploading-custom-vcl/) file).

This subroutine can be empty to use the default configuration, which is equivalent to:

```vcl
sub iiif_config {
  set req.http.X-IIIF-Version = "2";
}
```

### Options

Options are set as headers on the client request. (Note these headers are sanitised and set to their default value before `iiif_config` is called, and validated afterwards.)

#### `X-IIIF-Version`

The version of the IIIF image API to use.

Valid values:

- `2`

Running the tests
-----------------

> Requires Node.js 8, and a Fastly service with VCL and image optimization enabled. It will create and activate a new configuration version.

Firstly, run `npm install`.

Next, run `npm test` with the following environment variables:

- `FASTLY_API_KEY` ([API token](https://docs.fastly.com/guides/account-management-and-security/using-api-tokens) with `global` scope for the Fastly service)
- `FASTLY_DOMAIN` (domain name to configure the Fastly service with)
- `FASTLY_SERVICE_ID` ([ID of the Fastly service](https://docs.fastly.com/guides/account-management-and-security/finding-and-managing-your-account-info#finding-your-service-id))
- `S3_BUCKET_NAME` (name of the S3 bucket) 

### Backend

The backend is an [Amazon S3](https://aws.amazon.com/s3/) bucket, containing the following files:

- `/cats/more/cat-manipulating.jpg`
  - `Content-Type: image/jpeg`
- `/cats/pop6.jpg`
  - `Cache-Control: no-store, must-revalidate, private`
  - `Content-Type: image/jpeg`
- `/foo.txt`
  - `Cache-Control: max-age=100, public`
  - `Content-Type: text/plain`
- `/pug-instagram.jpg`
  - `Cache-Control: no-cache, no-store, must-revalidate`
  - `Content-Type: image/jpeg`
  - `Surrogate-Control: max-age=3600`
- `/pug-life.jpg`
  - `Cache-Control: max-age=3600, public`
  - `Content-Type: image/jpeg`

Any other path will see a `403 Forbidden` response.
