# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/4c5a1641-f4d6-4f2c-bb03-088313183a0f

## Run Locally

**Prerequisites:**  Node.js


1. Copy `.env.example` to `.env`
2. Get a Gemini API key from https://aistudio.google.com/app/apikey and paste it as `GEMINI_API_KEY`
3. Go to Firebase Console → Project Settings → General → Your apps → Web app → SDK Config, and copy the Firebase config values into the `VITE_FIREBASE_*` variables
4. In Firebase Console → Authentication → Settings → Authorized Domains, add `localhost`
5. Run `npm install` then `npm run dev`
