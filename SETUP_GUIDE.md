# Gladiator - Setup Guide

Your complete AI-powered fitness app is ready. Here's how to get it running.

---

## What's Working

✅ **Progress Photo AI Analysis** - Upload photos → ChatGPT Vision analyzes muscles
✅ **Auto Workout Adjustment** - App adjusts your plan based on lagging muscles  
✅ **User Auth** - Login/signup integrated
✅ **Workout Logging** - Track sets, reps, weight
✅ **Nutrition Planning** - TDEE + meal planning
✅ **Payments** - Stripe integrated (ready to activate)
✅ **Web + Mobile** - Full stack included

---

## 1. Set Up Environment Variables

You **MUST** add your API keys for this to work.

### Create `.env.local` in the root directory:

```
# OpenAI API Key (for progress photo analysis)
OPENAI_API_KEY=sk-your-key-here

# Get it from: https://platform.openai.com/api-keys
```

### Create `.env.local` in `/convex` directory:

```
# Same OpenAI key
OPENAI_API_KEY=sk-your-key-here
```

**How to get OpenAI API Key:**
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy it
4. Paste into `.env.local`

---

## 2. Install Dependencies

```bash
bun install
```

(If you don't have `bun`, install it: `curl -fsSL https://bun.sh/install | bash`)

---

## 3. Run Locally

**Terminal 1 - Convex Backend:**
```bash
bunx convex dev
```

**Terminal 2 - Web App:**
```bash
bun run dev
```

Visit: `http://localhost:5173`

---

## 4. How the Progress Photo Feature Works

1. **User uploads photo** from `/progress` page
2. **ChatGPT Vision analyzes** it instantly:
   - Identifies lagging muscles (e.g., "triceps are small")
   - Identifies strong muscles
   - Gives personalized recommendations
3. **Workout auto-adjusts**:
   - Exercises targeting lagging muscles get prioritized
   - Next workout shows these first
4. **User sees feedback**:
   - "Your triceps are lagging. Starting next week, we'll add 3 tricep exercises."

---

## 5. Deploy to Production

### Deploy Backend (Convex)

Convex is fully managed:

```bash
bunx convex deploy
```

Follow prompts. It'll give you a production URL.

### Deploy Frontend (Vercel)

```bash
bunx vercel
```

Or connect GitHub repo directly.

---

## 6. Set Up Payments

Your payment system is built in, ready to activate:

1. Get Stripe key from https://stripe.com
2. Add to Convex environment variables (in dashboard):
   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```
3. Activate subscription tiers (see `/src/pages/subscribe.tsx`)

---

## 7. Key Files to Know

**Progress Photo System:**
- `/convex/progressPhotosAi.ts` - ChatGPT Vision integration
- `/convex/workoutAi.ts` - Workout adjustment logic
- `/src/pages/progress.tsx` - Upload UI

**Workout System:**
- `/convex/workouts.ts` - Logging sets/reps
- `/convex/progression.ts` - Weight recommendations

**Nutrition:**
- `/convex/nutrition.ts` - TDEE calculations
- `/convex/mealPlan.ts` - Meal generation

---

## 8. Troubleshooting

**"OpenAI API key not configured"**
→ Make sure `.env.local` has `OPENAI_API_KEY=sk-...`

**"Photo analysis failed"**
→ Check OpenAI API key is valid and has credits

**App won't start**
→ Run `bun install` again, delete `node_modules`, try again

**Build errors**
→ Run `bunx convex codegen` to regenerate types

---

## 9. Next Steps

1. **Test locally** - Upload a progress photo
2. **Deploy backend** - `bunx convex deploy`
3. **Deploy frontend** - `bunx vercel` or similar
4. **Enable payments** - Add Stripe keys
5. **Launch to users** - Share the link!

---

## Support

Stuck? Common issues:
- OpenAI key invalid → Get new one from https://platform.openai.com
- Port 5173 in use → Change in `vite.config.ts`
- Types not found → Run `bunx convex codegen`

---

**You have a complete, production-ready fitness app. Ship it!** 🚀
