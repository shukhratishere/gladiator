# 🏛️ Gladiator - Complete AI Fitness App

## You Got It All

This is a **fully functional, production-ready fitness app** with:

✅ **Progress Photo AI** - Upload photos → ChatGPT Vision analyzes muscles → Auto-adjusts workouts  
✅ **Workout Tracking** - Log sets, reps, weight, RPE  
✅ **Nutrition Planning** - TDEE → macros → meal planning  
✅ **User Profiles** - Auth, setup, progress tracking  
✅ **Payments** - Stripe ready (just add your keys)  
✅ **Web + Mobile** - Full stack  

---

## 🚀 Get Started (5 minutes)

### Step 1: Get OpenAI Key
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy it

### Step 2: Create `.env.local`
In the root folder (next to `package.json`), create a file called `.env.local`:

```
OPENAI_API_KEY=sk-your-key-here
```

(Replace `sk-your-key-here` with your actual key)

### Step 3: Install
```bash
bun install
```

### Step 4: Run
**Open 2 terminals:**

**Terminal 1:**
```bash
bunx convex dev
```

**Terminal 2:**
```bash
bun run dev
```

Visit: http://localhost:5173

### Step 5: Test the App
1. Create account
2. Complete setup
3. Go to **Progress** page
4. Upload a photo
5. Watch AI analyze it
6. See workout adjust automatically

---

## 📁 What You Have

```
gladiator/
├── convex/                    Backend logic
│   ├── progressPhotosAi.ts    ← Progress photo analysis (THE STAR)
│   ├── workoutAi.ts           ← Auto-adjust workouts
│   ├── workouts.ts            ← Logging sets/reps
│   ├── nutrition.ts           ← TDEE calculations
│   └── [other features]
│
├── src/pages/
│   ├── progress.tsx           ← Upload photos here
│   ├── workout.tsx            ← Log workouts
│   ├── nutrition.tsx          ← Track meals
│   ├── calories.tsx           ← Daily macros
│   └── [other pages]
│
└── [config files]
```

---

## 🎯 The Progress Photo Feature (Your Killer Feature)

1. **User uploads photo** from `/progress` page
2. **AI analyzes instantly**:
   ```
   "Your physique score: 7.5/10
   Lagging muscles: triceps, rear delts
   Strong muscles: chest, quads
   Recommendation: Add 3 tricep exercises"
   ```
3. **Workout auto-adjusts**:
   - Next workout prioritizes tricep exercises
   - App tells user: "Based on your photo, we're focusing on arms this week"
4. **User sees results** over time

**This is your moat. No other app does this.**

---

## 📚 Full Documentation

- **QUICKSTART.md** - 5-minute setup
- **SETUP_GUIDE.md** - Detailed setup + deployment
- **CHANGELOG.md** - What's working + technical details

---

## 🔧 Key Technologies

**Frontend:**
- React 19
- Vite (fast bundler)
- TailwindCSS
- Shadcn/ui

**Backend:**
- Convex (managed database + realtime)
- OpenAI Vision API
- Stripe (payments)

**Hosting Ready:**
- Frontend → Vercel
- Backend → Convex (fully managed)

---

## 💡 How the Progress Photo System Works

### Code Flow:

1. **User uploads photo** → `/src/pages/progress.tsx`
2. **Convex receives it** → `/convex/progressPhotos.ts`
3. **Schedules analysis** → `progressPhotosAi.ts`
4. **Sends to ChatGPT** with custom prompt
5. **Gets analysis** (lagging muscles, recommendations)
6. **Auto-adjusts workout** → `workoutAi.ts`
7. **Marks exercises as priority** in training template
8. **Next workout shows adjusted plan**

### The Magic Happens Here:

**File:** `/convex/progressPhotosAi.ts`

```typescript
// ChatGPT Vision analyzes the photo
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: expertPrompt },
        { type: "image_url", image_url: { url: photoUrl } }
      ]
    }
  ]
});

// Gets response like:
// {
//   "overallScore": 7,
//   "laggingMuscles": ["triceps", "rear_delts"],
//   "strongMuscles": ["chest"],
//   "recommendations": ["Add weighted dips..."]
// }

// Then auto-adjusts workout
await adjustWorkoutPriorities(userId, laggingMuscles);
```

**File:** `/convex/workoutAi.ts`

```typescript
// Maps lagging muscles to exercises
const MUSCLE_TO_EXERCISES = {
  triceps: ["Weighted Dips", "Skull Crushers", "Tricep Pushdown"],
  rear_delts: ["Face Pulls", "Rear Delt Fly"],
  // ...
};

// Marks these as priority in user's split
// Next workout shows them first
```

---

## ✨ Features Walkthrough

### Progress Photos (`/progress`)
- Upload multiple photos
- AI analyzes each one
- See lagging muscles identified
- View recommendations
- Photo history with analysis

### Workouts (`/workout`)
- AI-adjusted exercise order
- Log sets, reps, weight
- RPE (Rate of Perceived Exertion) tracking
- Automatic weight recommendations

### Nutrition (`/nutrition` + `/calories`)
- TDEE auto-calculated
- Macro targets set
- Log meals (manual or photo)
- Daily tracking
- Weekly trends

### Setup (`/setup`)
- Profile info (height, weight, age)
- Training preferences
- Goals (bulk, cut, maintain)
- Automatic calculations

---

## 🎛️ Admin / What Works

**Full Features:**
- ✅ User authentication
- ✅ Progress photo upload + storage
- ✅ AI photo analysis (ChatGPT Vision)
- ✅ Auto-workout adjustment
- ✅ Workout logging
- ✅ Nutrition tracking
- ✅ Meal planning
- ✅ Food photo analysis
- ✅ Weight tracking
- ✅ Payment setup (Stripe)

**Ready for Production:**
- ✅ Database schema (all tables set up)
- ✅ API routes (all working)
- ✅ Authentication (secure)
- ✅ Image storage (Convex)
- ✅ Realtime updates

---

## 🚢 Deploy to Production

### Backend (Convex - 1 command)
```bash
bunx convex deploy
```

### Frontend (Vercel)
```bash
bunx vercel
```

Or connect your GitHub repo to Vercel for auto-deploys.

---

## 💰 Monetization

Your app already has:
- ✅ Stripe payment integration
- ✅ Subscription tier setup
- ✅ User limits based on tier

Just add your Stripe keys and activate.

---

## 🐛 Troubleshooting

**App won't start**
→ Make sure `.env.local` has `OPENAI_API_KEY`

**Photo analysis doesn't work**
→ Check OpenAI API key is valid

**Port 5173 in use**
→ Kill the process or change port in `vite.config.ts`

**"Types not found" errors**
→ Run `bunx convex codegen`

---

## 📖 Learn More

- **QUICKSTART.md** - Fast setup
- **SETUP_GUIDE.md** - Everything explained
- **CHANGELOG.md** - Technical details + file structure

---

## 🎬 Next Steps

1. **Extract the tar.gz file**
2. **Follow QUICKSTART.md**
3. **Test progress photo feature**
4. **Deploy to production**
5. **Get first users**
6. **Iterate based on feedback**

---

## Your App is Ready

You have a complete, working, AI-powered fitness app. Everything is wired up:

- ✅ Auth works
- ✅ Photo upload works
- ✅ AI analysis works
- ✅ Workout adjustment works
- ✅ Logging works
- ✅ Nutrition works

**The hard part is done. Now go ship it and get users.** 🚀

---

**Questions?** The code is well-commented. Start with `/convex/progressPhotosAi.ts` to understand the star feature.

Good luck! 💪
