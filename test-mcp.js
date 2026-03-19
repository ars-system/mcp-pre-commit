#!/usr/bin/env node

/**
 * Test script for MCP server
 * Usage: node test-mcp.js [tool_name] [args_json]
 * 
 * Examples:
 *   node test-mcp.js check_project_setup '{"repo_path": "/path/to/repo"}'
 *   node test-mcp.js setup_git_and_precommit '{"repo_path": "/path/to/repo"}'
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const toolName = process.argv[2] || "check_project_setup";
const argsJson = process.argv[3] || "{}";
const repoPath = process.argv[4] || process.cwd();

let args;
try {
  args = JSON.parse(argsJson);
} catch (error) {
  console.error("Invalid JSON arguments:", error.message);
  process.exit(1);
}

// If no repo_path in args, use current directory or provided path
if (!args.repo_path) {
  args.repo_path = repoPath;
}

console.log(`Testing MCP server...`);
console.log(`Tool: ${toolName}`);
console.log(`Arguments:`, JSON.stringify(args, null, 2));
console.log(`---`);

// Create the MCP request
const initRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: {
      name: "test-client",
      version: "1.0.0",
    },
  },
};

const listToolsRequest = {
  jsonrpc: "2.0",
  id: 2,
  method: "tools/list",
  params: {},
};

const callToolRequest = {
  jsonrpc: "2.0",
  id: 3,
  method: "tools/call",
  params: {
    name: toolName,
    arguments: args,
  },
};

// Start the MCP server
const serverPath = join(__dirname, "dist", "index.js");
const server = spawn("node", [serverPath], {
  stdio: ["pipe", "pipe", "inherit"],
  env: { ...process.env, DEBUG: "true" },
});

let responseBuffer = "";

server.stdout.on("data", (data) => {
  responseBuffer += data.toString();
  
  // Try to parse complete JSON-RPC messages
  const lines = responseBuffer.split("\n");
  responseBuffer = lines.pop() || ""; // Keep incomplete line in buffer
  
  lines.forEach((line) => {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log("\n📩 Response:", JSON.stringify(response, null, 2));
        
        // If this is the tool call response, exit
        if (response.id === 3) {
          setTimeout(() => {
            server.kill();
            process.exit(0);
          }, 100);
        }
      } catch (error) {
        console.log("Raw output:", line);
      }
    }
  });
});

server.on("error", (error) => {
  console.error("❌ Server error:", error);
  process.exit(1);
});

server.on("close", (code) => {
  if (code !== 0 && code !== null) {
    console.error(`❌ Server exited with code ${code}`);
    process.exit(code);
  }
});

// Send requests sequentially
setTimeout(() => {
  console.log("\n📤 Sending initialize request...");
  server.stdin.write(JSON.stringify(initRequest) + "\n");
}, 100);

setTimeout(() => {
  console.log("\n📤 Sending list_tools request...");
  server.stdin.write(JSON.stringify(listToolsRequest) + "\n");
}, 500);

setTimeout(() => {
  console.log("\n📤 Sending call_tool request...");
  server.stdin.write(JSON.stringify(callToolRequest) + "\n");
}, 1000);

// Timeout after 30 seconds
setTimeout(() => {
  console.error("\n⏱️  Timeout waiting for response");
  server.kill();
  process.exit(1);
}, 30000);
