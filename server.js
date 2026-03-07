const http = require("http");
const fs = require("fs");
const path = require("path");

const rootDir = __dirname;
const dataDir = path.join(rootDir, "data");
const correctionsFile = path.join(dataDir, "corrections.json");
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function ensureStore() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(correctionsFile)) fs.writeFileSync(correctionsFile, "{}\n");
}

function readCorrections() {
  ensureStore();
  return JSON.parse(fs.readFileSync(correctionsFile, "utf8") || "{}");
}

function writeCorrections(corrections) {
  ensureStore();
  fs.writeFileSync(correctionsFile, `${JSON.stringify(corrections, null, 2)}\n`);
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        req.destroy();
        reject(new Error("body too large"));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function isValidCorrection(payload) {
  return payload
    && typeof payload.sampleId === "string"
    && typeof payload.text === "string"
    && typeof payload.autoLabel === "string"
    && typeof payload.manualLabel === "string";
}

async function handleApi(req, res) {
  if (req.method === "GET" && req.url === "/api/corrections") {
    sendJson(res, 200, { corrections: readCorrections() });
    return;
  }

  if (req.method === "POST" && req.url === "/api/corrections") {
    const body = await readBody(req);
    const payload = JSON.parse(body || "{}");
    if (!isValidCorrection(payload)) {
      sendJson(res, 400, { error: "invalid correction payload" });
      return;
    }

    const corrections = readCorrections();
    const correction = {
      sampleId: payload.sampleId,
      text: payload.text,
      autoLabel: payload.autoLabel,
      manualLabel: payload.manualLabel,
      confidence: Number(payload.confidence || 0),
      reason: payload.reason || "",
      source: payload.source || "manual",
      correctedAt: payload.correctedAt || new Date().toISOString()
    };
    corrections[correction.sampleId] = correction;
    writeCorrections(corrections);
    sendJson(res, 200, { correction });
    return;
  }

  sendJson(res, 404, { error: "not found" });
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  const filePath = path.normalize(path.join(rootDir, urlPath === "/" ? "index.html" : urlPath));

  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/")) {
      await handleApi(req, res);
      return;
    }
    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

server.listen(port, host, () => {
  ensureStore();
  console.log(`Cube Class server running at http://${host}:${port}`);
});
