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
    "@id": ""} if (req.http.Fastly-SSL, "https", "http") {"://"} req.http.Host req.http.X-IIIF-Prefix "/" req.http.X-IIIF-Identifier {"",
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
