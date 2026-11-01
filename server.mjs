#!/usr/bin/env node
/* 42 Cosmos Scan — local server (static files + tiny JSON-RPC proxies)
 *
 * Why this exists (measured 2026-11-01):
 * - Of the three known CometBFT endpoints for infinite_421018-1, only
 *   comet-rpc-infinite.mschihuahua.org returns CORS headers, and the nodes
 *   intermittently drop connections (esp. tx_search). Serving this site from
 *   this local server lets the page use a same-origin proxy (/comet-rpc),
 *   which rotates across all three CometBFT endpoints server-side where
 *   CORS does not apply.
 * - EVM RPC endpoints all send CORS *, but the proxy (/evm-rpc) is provided
 *   for symmetry / resilience.
 *
 * Usage:  node server.mjs [port]     (default 8787)
 * Then:   http://localhost:8787/
 * No dependencies; Node 18+ (global fetch).
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.argv[2] || 8787);

const COMET_HOSTS = [
  'https://comet-rpc.infinitepanda.xyz',
  'https://comet-rpc-infinite.mschihuahua.org',
  'https://comet-rpc.infinitedrive.xyz',
];
const EVM_HOSTS = [
  'https://evm-rpc.infinitepanda.xyz',
  'https://evm-rpc-infinite.mschihuahua.org',
  'https://evm-rpc.infinitedrive.xyz',
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function proxyRpc(req, res, hosts) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks).toString('utf8');
  let lastErr;
  for (let attempt = 0; attempt < hosts.length * 2; attempt++) {
    const host = hosts[attempt % hosts.length];
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 30000);
      const r = await fetch(host, {
        method: 'POST', signal: ctl.signal,
        headers: { 'Content-Type': 'application/json', 'User-Agent': '42-cosmos-scan-local-proxy' },
        body,
      }).finally(() => clearTimeout(t));
      const text = await r.text();
      res.writeHead(r.status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(text);
      return;
    } catch (e) { lastErr = e; await sleep(700 * (attempt + 1)); }
  }
  res.writeHead(502, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'proxy: all upstream RPCs failed: ' + (lastErr?.message || lastErr) } }));
}

const MIME = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.mjs': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript' };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }); return res.end(); }
  if (req.method === 'POST' && url.pathname === '/comet-rpc') return proxyRpc(req, res, COMET_HOSTS);
  if (req.method === 'POST' && url.pathname === '/evm-rpc') return proxyRpc(req, res, EVM_HOSTS);
  if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
  let path = url.pathname === '/' ? '/index.html' : url.pathname;
  path = normalize(path).replace(/^(\.\.[/\\])+/, '');
  try {
    const data = await readFile(join(dir, path));
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('not found'); }
}).listen(port, () => {
  console.log(`42 Cosmos Scan: http://localhost:${port}/`);
  console.log('Proxies: POST /comet-rpc (3 CometBFT endpoints, rotating), POST /evm-rpc');
});
