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
