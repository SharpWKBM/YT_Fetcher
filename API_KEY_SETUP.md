# YouTube API Key Setup Guide

To get 5x quota (50,000 units/day = ~490 channels/day) completely free, you need to create 5 separate Google Cloud projects with YouTube Data API v3 enabled.

## Steps to Create Each API Key

### 1. Create Google Cloud Project
1. Go to https://console.cloud.google.com/
2. Click "Select a project" → "New Project"
3. Name it (e.g., "YouTube Finder 1", "YouTube Finder 2", etc.)
4. Click "Create"

### 2. Enable YouTube Data API v3
1. In the new project, go to "APIs & Services" → "Library"
2. Search for "YouTube Data API v3"
3. Click on it and press "Enable"

### 3. Create API Key
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy the generated API key
4. (Optional but recommended) Click "Restrict Key":
   - Under "API restrictions", select "Restrict key"
   - Choose "YouTube Data API v3"
   - Under "Application restrictions", select "HTTP referrers" and add your Vercel domain
   - Click "Save"

### 4. Repeat for All 5 Projects
Repeat steps 1-3 for a total of 5 projects to get 5 API keys.

## Add Keys to Your Project

### Local Development (.env.local)
```bash
YOUTUBE_API_KEY=AIzaSy...your_first_key
YOUTUBE_API_KEY_2=AIzaSy...your_second_key
YOUTUBE_API_KEY_3=AIzaSy...your_third_key
YOUTUBE_API_KEY_4=AIzaSy...your_fourth_key
YOUTUBE_API_KEY_5=AIzaSy...your_fifth_key
```

### Vercel Production
1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add each key:
   - `YOUTUBE_API_KEY` = first key
   - `YOUTUBE_API_KEY_2` = second key
   - `YOUTUBE_API_KEY_3` = third key
   - `YOUTUBE_API_KEY_4` = fourth key
   - `YOUTUBE_API_KEY_5` = fifth key
4. Click "Save"
5. Redeploy your project

## How It Works

The system automatically rotates between API keys when quota is exceeded:
- Each key has 10,000 units/day quota
- 5 keys = 50,000 units/day total
- ~102 units per channel (search + details + uploads)
- **~490 channels per day** at zero cost

## Quota Reset

YouTube API quota resets daily at midnight Pacific Time (PT).

## Monitoring Usage

Check quota usage for each project:
1. Go to https://console.cloud.google.com/
2. Select the project
3. Go to "APIs & Services" → "Dashboard"
4. Click on "YouTube Data API v3"
5. View "Queries per day" chart

## Notes

- You can start with just 1 key and add more later
- The system works with 1-5 keys (automatically detects how many you provide)
- More keys = more daily quota = faster database growth
