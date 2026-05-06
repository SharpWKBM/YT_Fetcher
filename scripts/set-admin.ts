import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
  fetch: (url: string, init?: RequestInit) => {
    return fetch(url, {
      ...init,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });
  },
});

async function setAdmin(email: string) {
  try {
    console.log(`Setting admin access for: ${email}`);

    // Check if user exists
    const userResult = await client.execute({
      sql: 'SELECT id, email, name, is_admin FROM users WHERE email = ?',
      args: [email],
    });

    if (userResult.rows.length === 0) {
      console.error(`❌ User not found: ${email}`);
      console.log('\nAvailable users:');
      const allUsers = await client.execute('SELECT id, email, name, is_admin FROM users LIMIT 10');
      allUsers.rows.forEach((user: any) => {
        console.log(`  - ${user.email} (admin: ${user.is_admin === 1 ? 'yes' : 'no'})`);
      });
      process.exit(1);
    }

    const user = userResult.rows[0] as any;
    console.log(`Found user: ${user.email} (ID: ${user.id})`);

    if (user.is_admin === 1) {
      console.log('✓ User is already an admin');
      process.exit(0);
    }

    // Set admin flag
    await client.execute({
      sql: 'UPDATE users SET is_admin = 1 WHERE email = ?',
      args: [email],
    });

    console.log('✓ Admin access granted successfully!');
    console.log(`\nUser ${email} can now access the admin panel at /admin`);

  } catch (error) {
    console.error('Error setting admin:', error);
    process.exit(1);
  }
}

// Get email from command line argument or use default
const email = process.argv[2] || process.env.ADMIN_EMAIL || 'abdullahtutaev@gmail.com';

setAdmin(email).then(() => {
  process.exit(0);
});
