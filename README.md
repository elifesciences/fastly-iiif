IIIF image API implemented using Fastly IO
==========================================

[![Build Status](https://travis-ci.org/elifesciences/fastly-iiif.svg?branch=master)](https://travis-ci.org/elifesciences/fastly-iiif)

This library provides an implementation of the [IIIF image API](https://iiif.io/) using [Fastly Image Optimizer](https://www.fastly.com/products/web-and-mobile-performance/image-optimization)

Supported versions
------------------

- [2.1](https://iiif.io/api/image/2.1/) (level 0)

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

Options are set as headers on the client request. (Note these headers and sanitised and set to their default value before `iiif_config` is called, and validated afterwards.)

#### `X-IIIF-Version`

The version of the IIIF image API to use.

Valid values:

- `2`
