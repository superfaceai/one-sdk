function Test({ services }) {
  const response = std.unstable.fetch(services.default, {}).response();
  const body = response.bodyAuto();
  return body;
}