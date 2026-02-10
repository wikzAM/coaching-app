# Firebase Phone Auth Setup Guide

This guide walks through switching phone authentication from Twilio (via Supabase built-in) to Firebase Phone Auth backed by Google Cloud, with a Supabase Edge Function handling the token exchange.

## Architecture

```
User enters phone → Firebase sends SMS (Google Cloud) → User enters OTP
→ Firebase verifies → Get Firebase ID token → Supabase Edge Function verifies token
→ Creates/signs in Supabase user → Returns Supabase session → App authenticated
```

---

## 1. Google Cloud / Firebase Console Setup

### 1a. Create a Firebase Project (or use existing)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** (or select existing project linked to your GCP billing)
3. Enter a project name → Continue
4. Enable/disable Google Analytics as needed → **Create project**
5. Note your **Project ID** (visible in Project Settings) — you'll need it later

### 1b. Enable Phone Authentication

1. In Firebase Console → **Authentication** → **Sign-in method**
2. Click **Phone** → **Enable** → **Save**

### 1c. Add Your Android App to Firebase

1. In Firebase Console → **Project Settings** (gear icon) → **General**
2. Click **Add app** → select **Android**
3. Enter package name: `com.wikzam.coachingapp`
4. Enter app nickname: `Coaching App`
5. **SHA-1 fingerprint** — get it by running in the `frontend/android/` directory:
   ```bash
   cd android
   ./gradlew signingReport
   ```
   Copy the **SHA-1** value from the `debug` variant.
   > For production, also add your release keystore SHA-1 and SHA-256.
6. Click **Register app**
7. Download `google-services.json` and place it in: `frontend/` (project root — the Expo config plugin will handle placement)
8. Click **Continue** through the remaining steps (skip the native SDK setup — Expo handles this)

### 1d. Enable Android Device Verification API (for silent reCAPTCHA)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select the same project linked to your Firebase project
3. Go to **APIs & Services** → **Library**
4. Search for **Android Device Verification** → **Enable** it
5. Also search for **Firebase Installations API** → **Enable** it

### 1e. (Optional) Add iOS App

1. In Firebase Console → **Project Settings** → **Add app** → **iOS**
2. Bundle ID: `com.wikzam.coachingapp`
3. Download `GoogleService-Info.plist` to `frontend/`
4. For iOS phone auth, you also need APNs configuration:
   - Go to **Project Settings** → **Cloud Messaging** → **iOS app configuration**
   - Upload your APNs key or certificate

---

## 2. Supabase Edge Function Setup

### 2a. Set Environment Secrets

Run these commands from the `backend/` directory:

```bash
# Your Firebase project ID (from Firebase Console → Project Settings)
supabase secrets set FIREBASE_PROJECT_ID=your-firebase-project-id

# A random secret used to derive deterministic passwords for phone users
# Generate one with: openssl rand -base64 32
supabase secrets set PHONE_AUTH_SECRET=$(openssl rand -base64 32)
```

### 2b. Run the Database Migration

Before deploying, create the helper SQL function. Run this in the **Supabase SQL Editor** (Dashboard → SQL Editor):

```sql
-- Helper function to look up a user by phone number
-- Used by the phone-auth Edge Function for migrating existing Twilio users
CREATE OR REPLACE FUNCTION public.get_user_id_by_phone(p_phone text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM auth.users WHERE phone = p_phone LIMIT 1;
$$;

-- Restrict to service_role only (Edge Functions use service role key)
REVOKE ALL ON FUNCTION public.get_user_id_by_phone(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_id_by_phone(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_user_id_by_phone(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_phone(text) TO service_role;
```

### 2c. Deploy the Edge Function

```bash
cd backend
supabase functions deploy phone-auth --no-verify-jwt
```

The `--no-verify-jwt` flag is required because the user won't have a Supabase session yet when authenticating via phone.

---

## 3. Frontend Setup

### 3a. Install Firebase Packages

```bash
cd frontend
npx expo install @react-native-firebase/app @react-native-firebase/auth
```

### 3b. Place Firebase Config Files

- `google-services.json` → `frontend/` (root of the Expo project)
- `GoogleService-Info.plist` → `frontend/` (if supporting iOS)

### 3c. Rebuild the Native App

Since `@react-native-firebase` uses native modules, you must rebuild:

```bash
npx expo run:android
# or for iOS:
npx expo run:ios
```

> You cannot use Expo Go with `@react-native-firebase`. Use a development build (`expo-dev-client` is already installed).

---

## 4. Disable Twilio Phone Auth in Supabase

Once Firebase phone auth is working:

1. Go to **Supabase Dashboard** → **Authentication** → **Providers**
2. Disable the **Phone** provider (this was using Twilio)
3. This stops Twilio charges and routes all phone auth through Firebase

---

## 5. Testing

1. Build and run the app: `npx expo run:android`
2. Go to the login screen → Phone tab
3. Enter a real phone number (or use Firebase test numbers)
4. You should receive an SMS from Firebase (not Twilio)
5. Enter the OTP code
6. Verify that a Supabase session is created and you're navigated to the app

### Firebase Test Phone Numbers (optional)

For development, add test numbers in Firebase Console:
1. **Authentication** → **Sign-in method** → **Phone**
2. Scroll to **Phone numbers for testing**
3. Add a test number (e.g., `+1 555-555-1234`) with a fixed code (e.g., `123456`)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| SMS not received | Check SHA-1 fingerprint is correct; ensure Android Device Verification API is enabled |
| `auth/missing-client-identifier` | Enable Android Device Verification API in Google Cloud Console |
| `auth/app-not-authorized` | Verify package name matches in Firebase Console |
| Edge Function returns 500 | Check `FIREBASE_PROJECT_ID` and `PHONE_AUTH_SECRET` are set in Supabase secrets |
| Rebuild required after install | `@react-native-firebase` has native code — run `npx expo run:android` |
