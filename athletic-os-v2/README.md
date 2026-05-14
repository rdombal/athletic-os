# Athletic OS

Your personal health & performance tool. Calm, clear, athletic.

---

## Deploy to Vercel (10 min)

### 1. Push to GitHub
- Unzip this folder on your computer
- Go to github.com → New repository → name it `athletic-os` → Create
- Open GitHub Desktop → File → Add Local Repository → select the folder
- Commit all files → Push to GitHub

### 2. Deploy on Vercel
- Go to vercel.com → sign in with GitHub
- Click **Add New Project** → import `athletic-os` → **Deploy**

### 3. Add your API key
- In Vercel: Settings → Environment Variables
- Add: `ANTHROPIC_API_KEY` = your key from console.anthropic.com
- Deployments → Redeploy

### 4. Add to your phone
- Open your Vercel URL in Safari on iPhone
- Tap Share → **Add to Home Screen**
- Done — works like a native app

---

## Run locally
```bash
npm install
cp .env.example .env.local
# Paste your API key into .env.local
npm run dev
# Open http://localhost:3000
```
