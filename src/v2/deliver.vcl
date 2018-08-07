if (req.http.Fastly-Debug) {
  set resp.http.X-Fastly-IO-URL = req.http.X-Fastly-IO-URL;
}

if (req.http.X-IIIF-Info && resp.http.Content-Type != "application/json" && resp.http.Fastly-IO-Info ~ "idim=([0-9]+)x([0-9]+)") {
  set req.http.X-Cache-Control = resp.http.Cache-Control;
  set req.http.X-Fastly-IO-Info = resp.http.Fastly-IO-Info;
  set req.http.X-Fastly-IO-Width = re.group.1;
  set req.http.X-Fastly-IO-Height = re.group.2;

  restart;
}
