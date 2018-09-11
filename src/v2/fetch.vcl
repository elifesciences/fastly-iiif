if (beresp.http.Content-Type !~ "image/(?:gif|jpeg|png|webp)" && !req.backend.is_shield) {
  error 404 "Hidden as can't be processed by Fastly IO";
}
