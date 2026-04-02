#!/usr/bin/env node

/**
 * LoadPulse Agent CLI
 *
 * Usage:
 *   npx loadpulse-agent                    # Start on default port 3050
 *   npx loadpulse-agent --port 4000        # Custom port
 *   npx loadpulse-agent -p 4000            # Short flag
 */

// Parse CLI args
const args = process.argv.slice(2);
let port = 3050;

for (let i = 0; i < args.length; i++) {
  if ((args[i] === "--port" || args[i] === "-p") && args[i + 1]) {
    port = parseInt(args[i + 1]);
    i++;
  }
  if (args[i] === "--help" || args[i] === "-h") {
    console.log(`
  LoadPulse Agent — test runner for LoadPulse dashboard

  Usage:
    npx loadpulse-agent [options]

  Options:
    -p, --port <number>   Port to listen on (default: 3050)
    -h, --help            Show this help

  The agent runs a WebSocket server that the LoadPulse dashboard
  connects to. It executes load tests, stress tests, and more
  against any API server you point it at.

  Dashboard: https://github.com/ByteBridge-IT-Solutions-LLC/loadpulse
`);
    process.exit(0);
  }
}

process.env.AGENT_PORT = String(port);

// Start the server
import("./index.js");
