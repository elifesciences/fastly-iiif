if (!req.backend.is_shield) {
  unset bereq.http.host;
} else {
  set bereq.url = req.http.X-Original-URL;
}
