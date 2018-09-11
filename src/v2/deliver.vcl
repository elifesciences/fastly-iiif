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

if (req.http.X-IIIF-Info && resp.http.Content-Type != "application/json" && resp.http.Fastly-IO-Info ~ "idim=([0-9]+)x([0-9]+)") {
  set req.http.X-Cache-Control = resp.http.Cache-Control;
  set req.http.X-Fastly-IO-Info = resp.http.Fastly-IO-Info;
  set req.http.X-Fastly-IO-Width = re.group.1;
  set req.http.X-Fastly-IO-Height = re.group.2;

  restart;
}
