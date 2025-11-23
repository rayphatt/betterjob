# Quick Deploy Guide for betterjob.app

## Step 1: Deploy to Vercel via Dashboard

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/new
   - Sign in or create an account if needed

2. **Import Your Project:**
   - Click **"Add New..."** → **"Project"**
   - Choose one of these options:
     - **Option A (Recommended)**: Connect to GitHub/GitLab/Bitbucket
       - If your code is in a Git repo, import it
     - **Option B**: Use Vercel CLI
       - Run: `npx vercel` in your terminal
       - Follow the prompts

3. **If using CLI (Alternative):**
   ```bash
   cd /Users/raymondhatton/Desktop/BetterJob
   npx vercel
   ```
   - This will prompt you to login in the browser
   - Follow the prompts to deploy

## Step 2: Add Environment Variables

After the project is created, go to **Settings** → **Environment Variables** and add:

### Required Variables:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_value
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_value
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_value
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_value
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_value
NEXT_PUBLIC_FIREBASE_APP_ID=your_value
OPENAI_API_KEY=your_value
SERPAPI_API_KEY=your_value
```

### Optional (if using Stripe):
```
STRIPE_SECRET_KEY=your_value
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_value
STRIPE_WEBHOOK_SECRET=your_value
```

**Important:** Copy these values from your `.env.local` file.

## Step 3: Add Custom Domain (betterjob.app)

1. **Go to Project Settings:**
   - Click on your project in Vercel dashboard
   - Go to **Settings** → **Domains**

2. **Add Domain:**
   - Enter: `betterjob.app`
   - Click **Add**
   - Also add: `www.betterjob.app` (optional but recommended)

3. **Vercel will show DNS configuration:**
   - You'll see DNS records to add at your domain registrar
   - Copy these records

## Step 4: Configure DNS at Your Domain Registrar

Go to your domain registrar (where you bought betterjob.app) and add:

### For Root Domain (betterjob.app):
- **Type:** A Record
- **Name/Host:** @ (or leave blank)
- **Value:** `76.76.21.21` (Vercel will provide the exact IP)
- **TTL:** 3600

### For WWW (www.betterjob.app):
- **Type:** CNAME
- **Name/Host:** www
- **Value:** `cname.vercel-dns.com.` (Vercel will provide exact value)
- **TTL:** 3600

**Note:** The exact values will be shown in Vercel's domain settings page.

## Step 5: Wait for DNS Propagation

- Usually takes 5-30 minutes
- Vercel will automatically detect when DNS is configured
- SSL certificate will be automatically provisioned

## Step 6: Verify

Once DNS is configured:
- Visit: `https://betterjob.app`
- Your app should be live!

---

## Quick CLI Alternative

If you prefer using CLI, you can also run:

```bash
cd /Users/raymondhatton/Desktop/BetterJob
npx vercel --prod
```

This will:
1. Prompt you to login (opens browser)
2. Ask project configuration questions
3. Deploy your app
4. Give you a deployment URL

Then add the domain in Vercel dashboard as described in Step 3.

