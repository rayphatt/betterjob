# BetterJob Setup Guide

## Required API Keys

To run BetterJob, you'll need to set up API keys for the following services:

### 1. OpenAI API Key (Required for MVP)

**What it's used for:**
- Parsing resumes and extracting structured data
- Generating career path recommendations
- Generating task suggestions based on roles

**How to get it:**
1. Go to https://platform.openai.com/
2. Sign up or log in
3. Navigate to API Keys: https://platform.openai.com/api-keys
4. Click "Create new secret key"
5. Copy the key (you won't be able to see it again!)

**Cost:** Pay-as-you-go. Resume parsing uses GPT-4, which costs ~$0.01-0.03 per resume.

---

### 2. Firebase (Required for MVP)

**What it's used for:**
- User authentication
- Storing user profiles and onboarding data
- Storing job matches and user preferences

**How to get it:**
1. Go to https://console.firebase.google.com/
2. Create a new project (or use existing)
3. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable "Anonymous" sign-in (for MVP)
4. Create a Firestore database:
   - Go to Firestore Database
   - Click "Create database"
   - Start in test mode (we'll add security rules later)
5. Get your config:
   - Go to Project Settings (gear icon)
   - Scroll to "Your apps"
   - Click the web icon (`</>`) to add a web app
   - Copy the config values

**Required values:**
- `apiKey`
- `authDomain`
- `projectId`
- `storageBucket`
- `messagingSenderId`
- `appId`

**Cost:** Free tier includes generous limits for MVP

---

### 3. SerpAPI (Required for Job Fetching)

**What it's used for:**
- Fetching job listings from Google Jobs
- Getting job details, salaries, locations

**How to get it:**
1. Go to https://serpapi.com/
2. Sign up for a free account
3. Go to Dashboard: https://serpapi.com/dashboard
4. Copy your API key

**Cost:** Free tier includes 100 searches/month. Paid plans start at $50/month for 5,000 searches.

---

### 4. Stripe (Optional for MVP)

**What it's used for:**
- Processing payments
- Managing subscriptions

**How to get it:**
1. Go to https://dashboard.stripe.com/
2. Sign up or log in
3. Go to Developers > API keys
4. Copy your "Secret key" and "Publishable key"

**Note:** Use test keys for development, live keys for production.

**Cost:** 2.9% + $0.30 per transaction

---

## Setup Steps

1. **Copy the example environment file:**
   ```bash
   cp .env.local.example .env.local
   ```

2. **Edit `.env.local` and add your API keys:**
   ```bash
   # Open in your editor
   code .env.local  # or use your preferred editor
   ```

3. **Fill in at minimum:**
   - `OPENAI_API_KEY` (required for resume parsing)
   - Firebase config (required for user data)
   - `SERPAPI_API_KEY` (required for job fetching)

4. **Restart your dev server:**
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

---

## Testing Your Setup

1. **Test OpenAI:**
   - Try uploading a resume
   - Check terminal for errors
   - Should see "Extracting text from PDF/Word document" in logs

2. **Test Firebase:**
   - Complete onboarding flow
   - Check Firebase console for user data

3. **Test SerpAPI:**
   - Navigate to `/results` page
   - Should see job matches

---

## Troubleshooting

### "OPENAI_API_KEY is not set"
- Make sure `.env.local` exists
- Make sure the key is set correctly (no quotes, no spaces)
- Restart your dev server after adding keys

### "Failed to parse resume"
- Check OpenAI API key is valid
- Check you have credits in your OpenAI account
- Check the file is a valid PDF or .docx

### Firebase errors
- Make sure all Firebase config values are set
- Make sure Anonymous auth is enabled
- Make sure Firestore is created

### SerpAPI errors
- Check API key is valid
- Check you haven't exceeded free tier limits
- Check the query/location parameters

---

## Next Steps

Once you have the API keys set up:
1. Test the resume upload flow
2. Test the onboarding flow
3. Test job fetching on the results page

If you encounter any issues, check the terminal logs for detailed error messages.

