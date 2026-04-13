# Mehak's Birthday Coupon Contest 💖

A gamified birthday countdown web app. Play one contest daily, earn points (1 point = ₹1 INR), and accumulate a birthday spending budget by May 2.

## Setup

### 1. Firebase

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable **Cloud Firestore** (start in test mode, then apply rules below).
3. Copy your web app config from **Project Settings → General → Your apps → Firebase SDK snippet**.

### 2. Config file

```bash
cp firebase-config.example.js firebase-config.js
```

Edit `firebase-config.js` with your Firebase project values.

### 3. Firestore initial data

Create these documents in the Firebase Console:

**Collection `users` → Document `mehak`:**

```json
{ "points": 0, "contestsPlayed": 0, "lastPlayedDate": "" }
```

**Collection `config` → Document `currentContest`:**

```json
{
  "id": "day1",
  "title": "Your first challenge!",
  "body": "What is Naman's favourite thing about you? Write at least 3 sentences.",
  "points": 10,
  "activeDate": "2026-04-13"
}
```

Update the `currentContest` document daily with new content and point values.

### 4. Firestore rules

Copy the contents of `firestore.rules.example` into **Firestore → Rules** in the Firebase Console.

### 5. Local preview

Open `index.html` in a browser, or use any static server:

```bash
npx serve .
```

### 6. Deploy to Vercel

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy
vercel
```

Make sure `firebase-config.js` is present in the deployed files. You can either:
- Commit it to a **private** repository, or
- Use a Vercel build command that generates it from environment variables:

```bash
# In Vercel project settings, set Build Command to:
echo "window.__FIREBASE_CONFIG__ = { apiKey: \"$FB_API_KEY\", authDomain: \"$FB_AUTH_DOMAIN\", projectId: \"$FB_PROJECT_ID\", storageBucket: \"$FB_STORAGE_BUCKET\", messagingSenderId: \"$FB_SENDER_ID\", appId: \"$FB_APP_ID\" };" > firebase-config.js
```

Then add each `FB_*` variable in **Vercel → Settings → Environment Variables**.

## Users

| Username | Password    | Role  |
|----------|-------------|-------|
| naman    | NALAMBA     | admin |
| mehak    | ilovenaman  | user  |

- **Admin** can submit unlimited times (no points are saved — testing only).
- **User** can submit once per day; points and stats update in Firestore.
