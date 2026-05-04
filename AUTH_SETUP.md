# Authentication Setup Guide

This guide explains how to set up Google and GitHub OAuth authentication for your YouTube Channel Finder app.

## Prerequisites

- A Google Cloud account
- A GitHub account
- Your deployed Vercel URL (e.g., `https://youtube-finder-nine.vercel.app`)

---

## Google OAuth Setup

### 1. Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. If prompted, configure the OAuth consent screen first:
   - User Type: **External**
   - App name: **YouTube Channel Finder**
   - User support email: Your email
   - Developer contact: Your email
   - Click **Save and Continue** through all steps

### 2. Configure OAuth Client

1. Application type: **Web application**
2. Name: **YouTube Channel Finder**
3. Authorized JavaScript origins:
   - `http://localhost:3000` (for local development)
   - `https://youtube-finder-nine.vercel.app` (your production URL)
4. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://youtube-finder-nine.vercel.app/api/auth/callback/google`
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

---

## GitHub OAuth Setup

### 1. Create OAuth App

1. Go to [GitHub Settings](https://github.com/settings/developers)
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in the details:
   - Application name: **YouTube Channel Finder**
   - Homepage URL: `https://youtube-finder-nine.vercel.app`
   - Authorization callback URL: `https://youtube-finder-nine.vercel.app/api/auth/callback/github`
4. Click **Register application**
5. Copy the **Client ID**
6. Click **Generate a new client secret** and copy it

### 2. Add Local Development Callback (Optional)

For local testing, create a second OAuth app with:
- Homepage URL: `http://localhost:3000`
- Callback URL: `http://localhost:3000/api/auth/callback/github`

---

## Environment Variables

### Local Development (.env.local)

```bash
# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### Generate NEXTAUTH_SECRET

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

Or use this online generator: https://generate-secret.vercel.app/32

### Vercel Production

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - `NEXTAUTH_URL` = `https://youtube-finder-nine.vercel.app`
   - `NEXTAUTH_SECRET` = (your generated secret)
   - `GOOGLE_CLIENT_ID` = (from Google Cloud Console)
   - `GOOGLE_CLIENT_SECRET` = (from Google Cloud Console)
   - `GITHUB_CLIENT_ID` = (from GitHub OAuth App)
   - `GITHUB_CLIENT_SECRET` = (from GitHub OAuth App)
4. Click **Save**
5. Redeploy your project

---

## Testing Authentication

### Local Testing

1. Start your dev server: `npm run dev`
2. Visit `http://localhost:3000`
3. Click **Sign In**
4. Test both Google and GitHub login

### Production Testing

1. Visit your deployed URL
2. Click **Sign In**
3. Verify authentication works
4. Check that your tier badge shows "Free"
5. Verify usage counter shows "0/10 viewed"

---

## Troubleshooting

### "Redirect URI mismatch" error

- Ensure your redirect URIs in Google/GitHub exactly match your deployed URL
- Check for trailing slashes (should NOT have them)
- Verify both `http://localhost:3000` and your production URL are added

### "Invalid client" error

- Double-check your Client ID and Client Secret are correct
- Ensure environment variables are set in Vercel
- Redeploy after adding environment variables

### Session not persisting

- Verify `NEXTAUTH_SECRET` is set and is the same across deployments
- Check that `NEXTAUTH_URL` matches your actual domain

### Database errors

- Ensure Turso database credentials are correct
- Run the app once to initialize the `users` table
- Check Vercel logs for detailed error messages

---

## Security Notes

- Never commit `.env.local` to git (already in `.gitignore`)
- Rotate secrets if they are ever exposed
- Use different OAuth apps for development and production
- Keep Client Secrets secure and never expose them in frontend code
