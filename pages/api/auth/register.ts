import type { NextApiRequest, NextApiResponse } from 'next';
import { hashPassword, validatePassword, validateEmail } from '@/lib/auth';
import { createUserWithPassword, getUserByEmail } from '@/lib/users';
import { createTrial } from '@/lib/subscription';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await hashPassword(password);
    const userId = await createUserWithPassword(email, name, passwordHash);

    await createTrial(userId, 7);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully with 7-day trial',
      userId,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Failed to register user' });
  }
}
