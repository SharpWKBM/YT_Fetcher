// test-channel-discovery.js
// Simple test using direct imports (requires ts-node or running after build)

async function test() {
  console.log('Testing channel discovery across all regions...\n');

  // Import the compiled API route handler
  const handler = require('./.next/server/pages/api/cron/fetch-channels.js').default;

  // Mock request and response
  const mockReq = {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.CRON_SECRET || 'test-secret'}`
    }
  };

  const mockRes = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      console.log('\n=== CRON JOB RESPONSE ===');
      console.log(JSON.stringify(data, null, 2));
      return this;
    }
  };

  console.log('Triggering cron job...\n');
  await handler(mockReq, mockRes);
}

test().catch(console.error);
