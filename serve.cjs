// Zero-dependency static file server using only Node.js built-ins.
// Serves the pre-built dist/ folder — no npm install required.
const http     = require('http');
const fs       = require('fs');
const path     = require('path');
const { execSync } = require('child_process');

const PREFERRED = parseInt(process.env.PORT || '5173', 10);
const ROOT      = path.join(__dirname, 'dist');

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
};

function handler(req, res) {
  let urlPath  = req.url.split('?')[0];
  let filePath = path.join(ROOT, urlPath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(ROOT, 'index.html');
  }

  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

function killPort(port) {
  try {
    // lsof works on macOS/Linux; on Windows this will throw and we ignore it
    const pids = execSync(`lsof -t -i:${port} 2>/dev/null`, { encoding: 'utf8' })
      .trim().split('\n').filter(Boolean);
    pids.forEach(pid => {
      try { process.kill(parseInt(pid, 10), 'SIGTERM'); } catch (_) {}
    });
    return pids.length > 0;
  } catch (_) {
    return false;
  }
}

function startOnPort(port, attempt) {
  const server = http.createServer(handler);

  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (attempt === 0) {
        console.log(`  Port ${port} busy — killing existing process…`);
        killPort(port);
        // Give the OS 500 ms to release the port, then retry once
        setTimeout(() => startOnPort(port, 1), 500);
      } else {
        // Try the next port instead
        const next = port + 1;
        console.log(`  Port ${port} still busy — trying ${next}…`);
        startOnPort(next, 0);
      }
    } else {
      throw err;
    }
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`\n  Grid Outage Planner running at http://localhost:${port}\n`);
  });
}

startOnPort(PREFERRED, 0);
