import http from "node:http";

const port = Number(process.env.PORT || 8787);
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || "*").split(",").map((origin) => origin.trim())
);
const proApiKey = process.env.PRO_API_KEY || "";

function setCorsHeaders(response, request) {
  const requestOrigin = request.headers.origin;
  const allowOrigin = allowedOrigins.has("*") || allowedOrigins.has(requestOrigin)
    ? requestOrigin || "*"
    : "null";
  response.setHeader("Access-Control-Allow-Origin", allowOrigin);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
}

function sendJson(response, request, status, body) {
  setCorsHeaders(response, request);
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function hasProAccess(request) {
  const authorization = request.headers.authorization || "";
  return proApiKey.length > 0 && authorization === `Bearer ${proApiKey}`;
}

const server = http.createServer((request, response) => {
  if (request.method === "OPTIONS") {
    setCorsHeaders(response, request);
    response.writeHead(204);
    response.end();
    return;
  }

  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  if (request.method === "GET" && requestUrl.pathname === "/health") {
    sendJson(response, request, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/v1/pro/status") {
    sendJson(response, request, 200, { isProUser: hasProAccess(request) });
    return;
  }

  sendJson(response, request, 404, { error: "not_found" });
});

server.listen(port, () => {
  console.log(`Amazon Search Filter backend listening on port ${port}`);
});