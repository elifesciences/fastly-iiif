if (req.request == "HEAD" || req.request == "GET" || req.request == "FASTLYPURGE") {
  if (req.restarts > 0 && req.http.X-Fastly-IO-Info) {
    error 900 "Restart for info request";
  }
} else {
  error 405 "Not a IIIF method";
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

if (req.http.X-IIIF-Info) {
  # Info request
  set req.request = "HEAD";
} else {
  # Image request
  set req.url = req.url "?format=" req.http.X-Fastly-IO-Format;
}

set req.http.X-Fastly-IO-URL = req.url;
