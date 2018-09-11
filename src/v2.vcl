sub vcl_recv {

  if (req.request != "HEAD" && req.request != "GET" && req.request != "FASTLYPURGE") {
    error 405 "Not a IIIF method";
  }

  if (req.restarts > 0 && req.http.X-Fastly-IO-Info) {
    error 900 "Restart for info request";
  }

  # Sanitise headers
  unset req.http.X-IIIF-Info;
  unset req.http.X-IIIF-Prefix;
  unset req.http.X-IIIF-Identifier;

  # Keep track of the original URL
  set req.http.X-Original-URL = req.url;

  if (req.url.path ~ "^(?:/(.+?))?/([^/]+)/info.json$") {
    # Info request
    set req.http.X-IIIF-Info = "true";
    set req.http.X-IIIF-Prefix = re.group.1;
    set req.http.X-IIIF-Identifier = re.group.2;
  } else if (req.url.path ~ "^(?:/(.+?))?/([^/]+)/([^/]+)/([^/]+)/([^/]+)/([^/]+)\.([^/]+)$") {
    # Image request
    set req.http.X-IIIF-Prefix = re.group.1;
    set req.http.X-IIIF-Identifier = re.group.2;
    set req.http.X-IIIF-Region = re.group.3;
    set req.http.X-IIIF-Size = re.group.4;
    set req.http.X-IIIF-Rotation = re.group.5;
    set req.http.X-IIIF-Quality = re.group.6;
    set req.http.X-IIIF-Format = re.group.7;

    # Set Fastly IO values

    if (req.http.X-IIIF-Region != "full") {
      error 400 "Invalid region";
    }

    if (req.http.X-IIIF-Size != "full") {
      error 400 "Invalid size";
    }

    if (req.http.X-IIIF-Rotation != "0") {
      error 400 "Invalid rotation";
    }

    if (req.http.X-IIIF-Quality != "default") {
      error 400 "Invalid quality";
    }

    if (req.http.X-IIIF-Format != "jpg") {
      error 400 "Invalid format";
    } else {
      set req.http.X-Fastly-IO-Format = "pjpg";
    }
  } else {
    error 404 "Not a IIIF path";
  }

  # Change request from IIIF to Fastly IO

  set req.http.X-Fastly-Imageopto-Api = "fastly";
  set req.url = "/" req.http.X-IIIF-Identifier;
  if (req.http.X-IIIF-Prefix) {
    set req.url = "/" req.http.X-IIIF-Prefix req.url;
  }

#FASTLY recv

  if (req.http.X-IIIF-Info) {
    # Info request
    set req.request = "HEAD";
  } else {
    # Image request
    set req.url = req.url "?format=" req.http.X-Fastly-IO-Format;
  }

  set req.http.X-Fastly-IO-URL = req.url;

  return(lookup);
}

sub vcl_fetch {

  if (beresp.http.Content-Type !~ "image/(?:gif|jpeg|png|webp)" && !req.backend.is_shield) {
    error 404 "Hidden as can't be processed by Fastly IO";
  }

  unset beresp.http.Set-Cookie;
  unset beresp.http.Vary;

#FASTLY fetch

  if (beresp.http.Expires || beresp.http.Surrogate-Control ~ "max-age" || beresp.http.Cache-Control ~"(s-maxage|max-age)") {
    # keep the ttl here
  } else {
    # apply the default ttl
    set beresp.ttl = 3600s;
  }

  return(deliver);
}

sub vcl_hit {

#FASTLY hit

  if (!obj.cacheable) {
    return(pass);
  }

  return(deliver);
}

sub vcl_miss {

#FASTLY miss

  if (!req.backend.is_shield) {
    unset bereq.http.host;
    unset bereq.http.X-Fastly-IO-Format;
    unset bereq.http.X-Fastly-IO-URL;
    unset bereq.http.X-IIIF-Info;
    unset bereq.http.X-IIIF-Prefix;
    unset bereq.http.X-IIIF-Identifier;
    unset bereq.http.X-IIIF-Region;
    unset bereq.http.X-IIIF-Size;
    unset bereq.http.X-IIIF-Rotation;
    unset bereq.http.X-IIIF-Quality;
    unset bereq.http.X-IIIF-Format;
    unset bereq.http.X-Original-URL;
  } else {
    set bereq.url = req.http.X-Original-URL;
  }

  return(fetch);
}

sub vcl_deliver {

  if (req.http.Fastly-Debug && req.http.X-IIIF-Identifier) {
    set resp.http.X-Fastly-IO-URL = req.http.X-Fastly-IO-URL;
    set resp.http.X-IIIF-Prefix = req.http.X-IIIF-Prefix;
    set resp.http.X-IIIF-Identifier = req.http.X-IIIF-Identifier;
    if (!req.http.X-IIIF-Info) {
      set resp.http.X-IIIF-Region = req.http.X-IIIF-Region;
      set resp.http.X-IIIF-Size = req.http.X-IIIF-Size;
      set resp.http.X-IIIF-Rotation = req.http.X-IIIF-Rotation;
      set resp.http.X-IIIF-Quality = req.http.X-IIIF-Quality;
      set resp.http.X-IIIF-Format = req.http.X-IIIF-Format;
    }
  }

#FASTLY deliver

  if (req.http.X-IIIF-Info && resp.http.Content-Type != "application/json" && resp.http.Fastly-IO-Info ~ "idim=([0-9]+)x([0-9]+)") {
    set req.http.X-Cache-Control = resp.http.Cache-Control;
    set req.http.X-Fastly-IO-Info = resp.http.Fastly-IO-Info;
    set req.http.X-Fastly-IO-Width = re.group.1;
    set req.http.X-Fastly-IO-Height = re.group.2;

    restart;
  }

  return(deliver);
}

sub vcl_error {

#FASTLY error

  if (obj.status == 900) {
    unset obj.http.Accept-Ranges;
    unset obj.http.Retry-After;

    set obj.status = 200;
    set obj.response = "OK";
    set obj.http.Cache-Control = req.http.X-Cache-Control;
    set obj.http.Content-Type = "application/json";

    if (req.http.Fastly-Debug) {
      set obj.http.X-Fastly-IO-Info = req.http.X-Fastly-IO-Info;
    }

    synthetic {"{
      "@context": "http://iiif.io/api/image/2/context.json",
      "@id": ""} if(req.http.Fastly-SSL, "https", "http") {"://"} req.http.Host "/" if(req.http.X-IIIF-Prefix, req.http.X-IIIF-Prefix "/", "") req.http.X-IIIF-Identifier {"",
      "protocol": "http://iiif.io/api/image",
      "profile": [
        "http://iiif.io/api/image/2/level0.json",
        {
          "formats": [
            "jpg"
          ]
        }
      ],
      "width": "} req.http.X-Fastly-IO-Width {",
      "height": "} req.http.X-Fastly-IO-Height {"
    }"};

    return(deliver);
  }

  set obj.http.Content-Type = "text/plain; charset=us-ascii";

  synthetic obj.response;

  return(deliver);
}

sub vcl_pass {

#FASTLY pass

  if (!req.backend.is_shield) {
    unset bereq.http.host;
    unset bereq.http.X-Fastly-IO-Format;
    unset bereq.http.X-Fastly-IO-URL;
    unset bereq.http.X-IIIF-Info;
    unset bereq.http.X-IIIF-Prefix;
    unset bereq.http.X-IIIF-Identifier;
    unset bereq.http.X-IIIF-Region;
    unset bereq.http.X-IIIF-Size;
    unset bereq.http.X-IIIF-Rotation;
    unset bereq.http.X-IIIF-Quality;
    unset bereq.http.X-IIIF-Format;
    unset bereq.http.X-Original-URL;
  } else {
    set bereq.url = req.http.X-Original-URL;
  }

}

sub vcl_log {

#FASTLY log

}
