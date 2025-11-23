# Push to GitHub & Deploy Guide

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `betterjob` (or your preferred name)
3. Choose **Private** or **Public**
4. **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click **Create repository**

## Step 2: Push Your Code to GitHub

Run these commands in your terminal:

```bash
cd /Users/raymondhatton/Desktop/BetterJob

# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/betterjob.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Note:** You'll need to authenticate with GitHub (use a personal access token if prompted).

## Step 3: Deploy on Vercel

1. Go to https://vercel.com/new
2. Click **Import Git Repository**
3. Select your `betterjob` repository
4. Click **Import**

## Step 4: Configure Project

1. **Project Name:** `betterjob` (or keep default)
2. **Framework Preset:** Next.js (should auto-detect)
3. **Root Directory:** `./` (leave as is)
4. **Build Command:** `npm run build` (should auto-detect)
5. **Output Directory:** `.next` (should auto-detect)

## Step 5: Add Environment Variables

Click **Environment Variables** and add all variables from your `.env.local`:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `OPENAI_API_KEY`
- `SERPAPI_API_KEY`
- `STRIPE_SECRET_KEY` (if using)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (if using)
- `STRIPE_WEBHOOK_SECRET` (if using)

## Step 6: Deploy

Click **Deploy** and wait for the build to complete!

## Step 7: Add Domain (betterjob.app)

After deployment:

1. Go to your project in Vercel dashboard
2. Click **Settings** → **Domains**
3. Add: `betterjob.app`
4. Add: `www.betterjob.app` (optional)
5. Copy the DNS records shown
6. Add those DNS records at your domain registrar
7. Wait 5-30 minutes for DNS propagation
8. SSL will be automatically provisioned

---

## Alternative: Use GitHub CLI

If you have GitHub CLI installed:

```bash
cd /Users/raymondhatton/Desktop/BetterJob
gh repo create betterjob --private --source=. --remote=origin --push
```

This will create the repo and push in one command!

