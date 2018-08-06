if (beresp.http.Content-Type !~ "image/(?:gif|jpeg|png|webp)" && !req.backend.is_shield) {
  # File exists but can't be processed by Fastly IO, so hide its existence
  error 404;
}
