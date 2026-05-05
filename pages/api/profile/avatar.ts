import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { createClient } from '@libsql/client';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');

    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB
      filter: (part) => {
        return part.mimetype?.startsWith('image/') || false;
      },
    });

    const [fields, files] = await form.parse(req);

    const avatarFile = files.avatar?.[0];
    if (!avatarFile) {
      return res.status(400).json({ error: 'No avatar file provided' });
    }

    // Generate unique filename
    const ext = path.extname(avatarFile.originalFilename || '.jpg');
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    const newPath = path.join(uploadDir, filename);

    // Move file to final location
    fs.renameSync(avatarFile.filepath, newPath);

    // Generate public URL
    const avatarUrl = `/uploads/avatars/${filename}`;

    // Fetch user to get old avatar
    const userResult = await client.execute({
      sql: 'SELECT id, avatar_url FROM users WHERE email = ?',
      args: [session.user.email],
    });

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0] as any;

    // Delete old avatar if exists
    if (user.avatar_url && user.avatar_url.startsWith('/uploads/avatars/')) {
      const oldPath = path.join(process.cwd(), 'public', user.avatar_url);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Update user avatar in database
    await client.execute({
      sql: 'UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [avatarUrl, user.id],
    });

    return res.status(200).json({
      success: true,
      avatar_url: avatarUrl,
      message: 'Avatar uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return res.status(500).json({ error: 'Failed to upload avatar' });
  }
}
