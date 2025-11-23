# Next Steps: Deploy & Connect Domain

## ✅ Step 1: Code Pushed to GitHub
Your code is now at: https://github.com/rayphatt/betterjob

## Step 2: Deploy on Vercel

1. **Go to Vercel:**
   - Visit: https://vercel.com/new
   - Sign in (or create account)

2. **Import Repository:**
   - Click **"Import Git Repository"**
   - Select **rayphatt/betterjob**
   - Click **Import**

3. **Configure Project:**
   - **Project Name:** `betterjob` (or keep default)
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./` (leave as is)
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `.next` (auto-detected)

4. **Add Environment Variables:**
   Click **"Environment Variables"** and add these (copy from your `.env.local`):

   **Required:**
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `OPENAI_API_KEY`
   - `SERPAPI_API_KEY`

   **Optional (if using Stripe):**
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`

   **Important:** Make sure to add these for **Production**, **Preview**, and **Development** environments (or at least Production).

5. **Deploy:**
   - Click **"Deploy"**
   - Wait 2-3 minutes for build to complete
   - You'll get a URL like: `betterjob.vercel.app`

## Step 3: Add Custom Domain (betterjob.app)

1. **Go to Project Settings:**
   - In your Vercel project dashboard
   - Click **Settings** → **Domains**

2. **Add Domain:**
   - Enter: `betterjob.app`
   - Click **Add**
   - Vercel will show DNS configuration

3. **Also add WWW (optional but recommended):**
   - Enter: `www.betterjob.app`
   - Click **Add**

## Step 4: Configure DNS at Your Domain Registrar

Go to where you bought `betterjob.app` and add these DNS records:

### For Root Domain (betterjob.app):

**Option 1: A Record (Recommended)**
- **Type:** A
- **Name/Host:** `@` (or leave blank)
- **Value:** `76.76.21.21` (Vercel will show the exact IP)
- **TTL:** `3600` (or default)

**Option 2: CNAME (if your registrar supports it for root)**
- **Type:** CNAME
- **Name/Host:** `@` (or leave blank)
- **Value:** `cname.vercel-dns.com.` (Vercel will show exact value)
- **TTL:** `3600`

### For WWW (www.betterjob.app):

- **Type:** CNAME
- **Name/Host:** `www`
- **Value:** `cname.vercel-dns.com.` (Vercel will show exact value)
- **TTL:** `3600`

**Note:** The exact values will be displayed in Vercel's domain settings page. Copy them exactly!

## Step 5: Wait for DNS Propagation

- Usually takes **5-30 minutes**
- Can take up to 48 hours (rare)
- Vercel will automatically detect when DNS is configured
- You'll see a green checkmark when active

## Step 6: SSL Certificate

- Vercel automatically provisions SSL certificates
- Takes **5-10 minutes** after DNS is verified
- Your site will be available at `https://betterjob.app`

## Step 7: Verify Everything Works

1. Visit: `https://betterjob.app`
2. Test the app functionality
3. Check that all API calls work (Firebase, OpenAI, SerpAPI)

## Troubleshooting

**Domain not working?**
- Check DNS records match exactly what Vercel shows
- Wait longer for DNS propagation
- Use `dig betterjob.app` or `nslookup betterjob.app` to check DNS

**Build failing?**
- Check Vercel build logs
- Verify all environment variables are set
- Check that all dependencies are in `package.json`

**Need help?**
- Vercel Docs: https://vercel.com/docs
- Vercel Support: https://vercel.com/support

---

## Quick Checklist

- [ ] Code pushed to GitHub ✅
- [ ] Deployed on Vercel
- [ ] Environment variables added
- [ ] Domain added in Vercel
- [ ] DNS records configured at registrar
- [ ] DNS propagated (green checkmark in Vercel)
- [ ] SSL certificate issued
- [ ] Site accessible at https://betterjob.app

