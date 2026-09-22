import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const root = resolve(process.argv[3] || ".");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".mp3": "audio/mpeg" };
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    const name = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const path = resolve(root, `.${name}`);
    if (!path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    const data = await readFile(path);
    response.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream", "Cache-Control": "no-store" }).end(data);
  } catch { response.writeHead(404).end(); }
}).listen(Number(process.argv[2] || 5174), "127.0.0.1");
