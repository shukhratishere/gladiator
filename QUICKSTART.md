# ⚡ Quickstart (5 minutes)

## 1️⃣ Get OpenAI API Key
Go to https://platform.openai.com/api-keys and copy your key.

## 2️⃣ Create `.env.local`
In the **root folder**, create `.env.local`:
```
OPENAI_API_KEY=sk-your-key-here
```

## 3️⃣ Install & Run
```bash
bun install

# Terminal 1:
bunx convex dev

# Terminal 2 (different terminal):
bun run dev
```

## 4️⃣ Visit App
Go to `http://localhost:5173`

## 5️⃣ Test Progress Photo Feature
1. Go to `/progress`
2. Upload a photo of yourself
3. Wait ~5 seconds
4. See AI analysis appear
5. Go to `/workout` to see auto-adjusted plan

---

**That's it! The app is fully working.** 🎉

---

## Troubleshooting

**"OpenAI API key not configured"**
→ Check `.env.local` has the key

**"Port already in use"**
→ Kill process: `lsof -i :5173` then `kill -9 <PID>`

**Build errors**
→ `rm -rf node_modules && bun install`

---

See **SETUP_GUIDE.md** for full details.
See **CHANGELOG.md** for what's working.
