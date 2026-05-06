import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
  fetch: (url, init) => {
    return fetch(url, {
      ...init,
      signal: AbortSignal.timeout(30000),
    });
  },
});

async function checkUser(email: string) {
  try {
    console.log(`Checking user: ${email}\n`);

    // Check user table
    const userResult = await client.execute({
      sql: 'SELECT id, email, name, tier, is_admin, created_at FROM users WHERE email = ?',
      args: [email],
    });

    if (userResult.rows.length === 0) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    const user = userResult.rows[0] as any;
    console.log('User details:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.name || '(not set)'}`);
    console.log(`  Tier: ${user.tier}`);
    console.log(`  Admin: ${user.is_admin === 1 ? 'Yes ✓' : 'No'}`);
    console.log(`  Created: ${user.created_at}`);

    // Check if password hash exists (it's in the users table)
    const hasPassword = user.password_hash !== null && user.password_hash !== '';

    console.log(`\nPassword hash: ${hasPassword ? 'Set ✓' : 'Not set ❌'}`);

    if (!hasPassword) {
      console.log('\n⚠️  This account was created via OAuth (Google/GitHub) and has no password.');
      console.log('To enable email/password login, you need to set a password.');
      console.log('\nRun: npx tsx scripts/set-password.ts <email> <password>');
    }

  } catch (error) {
    console.error('Error checking user:', error);
    process.exit(1);
  }
}

const email = process.argv[2] || 'abdullahtutaev@gmail.com';
checkUser(email).then(() => process.exit(0));
