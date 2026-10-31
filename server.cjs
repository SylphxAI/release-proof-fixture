const { createHash } = require("node:crypto");
const { createServer } = require("node:http");
const { version } = require("./source.cjs");

function server(environment = process.env) {
  const configuration = environment.PROOF_CONFIGURATION;
  const secret = environment.PROOF_SECRET;
  const healthy = Boolean(configuration && secret);
  const body = JSON.stringify({
    version,
    configuration: configuration || null,
    secret_sha256: secret ? createHash("sha256").update(secret).digest("hex") : null,
  });
  return createServer((request, response) => {
    if (request.method !== "GET" || request.url !== "/healthz") {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(healthy ? 200 : 503, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    response.end(body);
  });
}

if (require.main === module) {
  const listener = server();
  listener.listen(Number(process.env.PORT || 8080), "0.0.0.0");
  process.once("SIGTERM", () => listener.close());
}

module.exports = { server };
