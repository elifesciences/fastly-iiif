sub vcl_recv {

  if (req.restarts > 0 && req.http.X-Fastly-IO-Info) {
    error 900 "Restart for info request";
  }

  # Sanitise headers
  set req.http.X-IIIF-Version = "2";
  unset req.http.X-IIIF-Info;
  unset req.http.X-IIIF-Prefix;
  unset req.http.X-IIIF-Identifier;

  call iiif_config;

  if (req.http.X-IIIF-Version != "2") {
    error 500 "Unknown IIIF version";
  }

  if (req.request != "HEAD" && req.request != "GET" && req.request != "FASTLYPURGE") {
    error 405 "Not a IIIF method";
  }

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
    if (req.http.X-IIIF-Region == "full") {
      // Do nothing
    } else if (req.http.X-IIIF-Region ~ "^(?:square|\d+,\d+(?:,[1-9]\d*){2}|pct:(?:[1-9]?\d(?:\.\d+)?),(?:\d{1,2}(?:\.\d+)?)(?:,(?:(?:0(?:\.0*[1-9]\d*))|(?:[1-9][0-9]?(?:\.0*[1-9]\d*)?)|(?:100(?:\.0+)?))){2})$") {
      error 400 "Unsupported region parameter";
    } else {
      error 400 "Invalid region parameter";
    }

    if (req.http.X-IIIF-Size == "full") {
      // Do nothing
    } else if (req.http.X-IIIF-Size ~ "^(?:max|[1-9]\d*,|,[1-9]\d*|pct:(?:100(?:\.0+)?|0\.0*[1-9]\d*|[1-9]\d?(?:\.\d+)?)|!?[1-9]\d*,[1-9]\d*)$") {
      error 400 "Unsupported size parameter";
    } else {
      error 400 "Invalid size parameter";
    }

    if (req.http.X-IIIF-Rotation == "0") {
      // Do nothing
    } else if (req.http.X-IIIF-Rotation ~ "^!?(?:360(?:\.0+)?$|3[0-5][0-9]|[12][0-9][0-9]|[1-9]?[0-9])(?:\.[0-9]+)?$") {
      error 400 "Unsupported rotation parameter";
    } else {
      error 400 "Invalid rotation parameter";
    }

    if (req.http.X-IIIF-Quality == "default") {
      // Do nothing
    } else if (req.http.X-IIIF-Quality ~ "^(?:bitonal|color|gray)$") {
      error 400 "Unsupported quality parameter";
    } else {
      error 400 "Invalid quality parameter";
    }

    if (req.http.X-IIIF-Format == "jpg") {
      set req.http.X-Fastly-IO-Format = "pjpg";
    } else if (req.http.X-IIIF-Format ~ "^(?:gif|jp2|pdf|png|tif|webp)$") {
      error 400 "Unsupported format parameter";
    } else {
      error 400 "Invalid format parameter";
    }
    set req.url = req.url "?format=" req.http.X-Fastly-IO-Format;
  }

  set req.http.X-Fastly-IO-URL = req.url;

  return(lookup);
}

sub vcl_fetch {
  if (beresp.http.Fastly-IO-Error ~ "not a supported image format") {
    error 404 "Hidden as can't be processed by Fastly IO";
  } else if (beresp.status >= 400 && beresp.status < 600) {
    error beresp.status;
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

  call iiif_backend_fetch;

  return(fetch);
}

sub vcl_deliver {

  if (req.http.Fastly-Debug && req.http.X-IIIF-Identifier) {
    set resp.http.X-Fastly-IO-URL = req.http.X-Fastly-IO-URL;
    set resp.http.X-IIIF-Version = req.http.X-IIIF-Version;
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
      "@context": "http://iiif.io/api/image/"} req.http.X-IIIF-Version {"/context.json",
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

  call iiif_backend_fetch;

}

sub vcl_log {

#FASTLY log

}

sub iiif_backend_fetch {

  if (!req.backend.is_shield) {
    unset bereq.http.host;
    unset bereq.http.X-Fastly-IO-Format;
    unset bereq.http.X-Fastly-IO-URL;
    unset bereq.http.X-IIIF-Version;
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
