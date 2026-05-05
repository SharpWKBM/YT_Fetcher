// Set up test environment variables
process.env.TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || 'file:test.db';
process.env.TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || 'test-token';
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret';
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
