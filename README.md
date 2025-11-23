# BetterJob - Career Matching Web Application

> "You weren't born to just clock in."

BetterJob is an AI-powered career discovery and job matching platform that helps people escape jobs they hate by discovering career paths that actually fit them.

## 🚀 Features

### Phase 1: Free Exploration (MVP)
- ✅ Beautiful landing page with hero section
- ✅ Complete onboarding flow (5 steps):
  1. Resume Upload (Optional) or Current/Past Role Input
  2. Task Selection
  3. Skills Selection
  4. Interests
  5. Work Preferences
- ✅ Career path exploration page with categorized role sections
- ✅ Responsive design with modern UI

### Coming Soon
- Resume parsing with OpenAI
- AI-powered career path generation
- Job matching algorithm
- Stripe payment integration
- Full dashboard with job feed

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Firebase (Firestore, Auth, Storage)
- **AI**: OpenAI API (GPT-4)
- **Job Data**: SerpAPI (Google Jobs)
- **Payments**: Stripe
- **Deployment**: Vercel

## 📦 Installation

1. **Clone the repository**
   ```bash
   cd BetterJob
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   
   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_key
   
   # SerpAPI Configuration
   SERPAPI_API_KEY=your_serpapi_key
   
   # Stripe Configuration
   STRIPE_SECRET_KEY=your_stripe_secret
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable
   STRIPE_WEBHOOK_SECRET=your_webhook_secret
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## 📁 Project Structure

```
/app
  /page.tsx                   # Landing page
  /onboarding
    /role/page.tsx           # Step 1: Role input
    /resume/page.tsx         # Step 2: Resume upload
    /tasks/page.tsx          # Step 3: Task selection
    /skills/page.tsx         # Step 4: Skills selection
    /preferences/page.tsx    # Step 5: Work Preferences
    /preferences/page.tsx    # Step 6: Work prefs
  /explore
    /page.tsx                # Career path visualization
/components
  /ui                        # shadcn components
/lib
  /firebase.ts               # Firebase config
  /openai.ts                 # OpenAI helpers
  /stripe.ts                 # Stripe helpers
/types
  /user.ts                   # User type definitions
  /job.ts                    # Job type definitions
```

## 🎨 Design System

### Colors
- **Primary Blue**: `#4461F2`
- **Success Green**: `#34D399`
- **Warning Yellow**: `#FBBF24`
- **Accent Purple**: `#A78BFA`

### Typography
- **Font**: Inter (Google Fonts)
- **Headings**: Bold (600-700 weight)
- **Body**: Regular (400-500 weight)

## 🚧 Development Status

### Completed ✅
- Project setup and configuration
- Landing page
- Complete onboarding flow (6 steps)
- Career exploration page (mock data)
- UI component library setup

### In Progress 🚧
- Resume parsing with OpenAI
- Firestore database integration
- AI career path generation

### Planned 📋
- Job matching algorithm
- Stripe payment integration
- Full dashboard
- Email notifications
- Career guides library

## 📝 Next Steps

1. Set up Firebase project and configure authentication
2. Implement resume parsing API endpoint
3. Create Firestore database schema and save user data
4. Integrate OpenAI for career path generation
5. Build job matching algorithm
6. Set up Stripe for payments

## 🤝 Contributing

This is an MVP project. Contributions and feedback are welcome!

## 📄 License

Private project - All rights reserved

---

Built with ❤️ for people who weren't born to just clock in.

