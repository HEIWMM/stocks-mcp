
import http from 'http';
import { request } from 'http';

const PORT = 3007;
const BASE_URL = `http://localhost:${PORT}`;

async function testMcpEndpoint() {
  console.log('Testing MCP Endpoint...');

  // Test 1: GET request without session ID (should now create a session)
  console.log('\nTest 1: GET /mcp (Expect SSE stream start)');
  
  const options = {
    hostname: 'localhost',
    port: PORT,
    path: '/mcp',
    method: 'GET',
    headers: {
      'Accept': 'text/event-stream',
    }
  };

  const req = request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      console.log(`BODY: ${chunk}`);
      // If we get data, it means connection is successful
      req.destroy(); // Close connection
    });
    res.on('end', () => {
      console.log('No more data in response.');
    });
  });

  req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
  });

  req.end();
}

// Wait for server to start
setTimeout(testMcpEndpoint, 2000);
