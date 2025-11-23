# Domain Setup Guide for BetterJob

## Prerequisites

1. ✅ Domain purchased from a registrar (e.g., GoDaddy, Namecheap, Google Domains, etc.)
2. ✅ Vercel account (sign up at https://vercel.com if needed)
3. ✅ App deployed on Vercel (or ready to deploy)

## Step 1: Deploy to Vercel (if not already deployed)

### Option A: Using Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy the project:**
   ```bash
   cd /Users/raymondhatton/Desktop/BetterJob
   vercel
   ```

4. **Follow the prompts:**
   - Link to existing project? **No** (first time)
   - Project name: **betterjob** (or your preferred name)
   - Directory: **./** (current directory)
   - Override settings? **No**

5. **For production deployment:**
   ```bash
   vercel --prod
   ```

### Option B: Using Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your Git repository (GitHub, GitLab, or Bitbucket)
3. Configure project settings:
   - Framework Preset: **Next.js**
   - Root Directory: **./**
   - Build Command: `npm run build`
   - Output Directory: `.next`
4. Add environment variables (from your `.env.local`):
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
5. Click **Deploy**

## Step 2: Add Custom Domain to Vercel

1. **Go to your Vercel project dashboard:**
   - Visit https://vercel.com/dashboard
   - Click on your **BetterJob** project

2. **Navigate to Settings:**
   - Click **Settings** in the top navigation
   - Click **Domains** in the left sidebar

3. **Add your domain:**
   - Enter your domain (e.g., `betterjob.com`)
   - Click **Add**

4. **Vercel will show you DNS configuration:**
   - You'll see DNS records to add at your domain registrar
   - Typically:
     - **A Record**: `@` → `76.76.21.21` (or similar Vercel IP)
     - **CNAME Record**: `www` → `cname.vercel-dns.com.` (or similar)

## Step 3: Configure DNS at Your Domain Registrar

The exact steps depend on your registrar, but generally:

### For Root Domain (e.g., betterjob.com):

**Option 1: A Record (Recommended)**
- Type: **A**
- Name/Host: `@` or leave blank
- Value: `76.76.21.21` (Vercel will provide the exact IP)
- TTL: `3600` (or default)

**Option 2: CNAME Record (if supported)**
- Type: **CNAME**
- Name/Host: `@` or leave blank
- Value: `cname.vercel-dns.com.` (Vercel will provide exact value)
- TTL: `3600` (or default)

### For WWW Subdomain (e.g., www.betterjob.com):

- Type: **CNAME**
- Name/Host: `www`
- Value: `cname.vercel-dns.com.` (Vercel will provide exact value)
- TTL: `3600` (or default)

### Common Registrars:

**GoDaddy:**
1. Log in → My Products → DNS
2. Add/Edit records as shown above

**Namecheap:**
1. Log in → Domain List → Manage → Advanced DNS
2. Add/Edit records as shown above

**Google Domains:**
1. Log in → DNS → Custom records
2. Add/Edit records as shown above

**Cloudflare:**
1. Log in → Select domain → DNS
2. Add/Edit records as shown above
3. Set proxy status to "DNS only" (gray cloud)

## Step 4: Wait for DNS Propagation

- DNS changes can take **5 minutes to 48 hours** to propagate
- Usually takes **15-30 minutes** for most changes
- You can check propagation status at: https://dnschecker.org

## Step 5: Verify Domain on Vercel

1. Go back to Vercel → Settings → Domains
2. Vercel will automatically detect when DNS is configured correctly
3. You'll see a green checkmark when the domain is active
4. SSL certificate will be automatically provisioned (can take a few minutes)

## Step 6: Test Your Domain

Once Vercel shows the domain as active:
1. Visit `https://yourdomain.com` in your browser
2. You should see your BetterJob app!
3. SSL should be automatically enabled (HTTPS)

## Troubleshooting

### "Domain not configured" error
- Double-check DNS records match exactly what Vercel provided
- Wait a bit longer for DNS propagation
- Use `dig yourdomain.com` or `nslookup yourdomain.com` to verify DNS

### SSL certificate not issued
- Wait 5-10 minutes after DNS is verified
- Check Vercel dashboard for SSL status
- Contact Vercel support if it takes longer than 24 hours

### Domain shows "Invalid Configuration"
- Make sure DNS records are correct
- Remove any conflicting records
- Ensure TTL is set appropriately

### App not loading on custom domain
- Check that the domain is assigned to the correct project
- Verify environment variables are set in Vercel
- Check Vercel deployment logs for errors

## Next Steps

After your domain is connected:
1. ✅ Update any hardcoded URLs in your app to use the new domain
2. ✅ Update Firebase Auth domains (if using custom domain for auth)
3. ✅ Update any external service configurations (Stripe webhooks, etc.)
4. ✅ Test all functionality on the new domain

## Need Help?

- Vercel Docs: https://vercel.com/docs/concepts/projects/domains
- Vercel Support: https://vercel.com/support

