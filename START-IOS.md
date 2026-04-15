# Run DropYou on iOS (Quick Guide)

## Auth & API (first-time setup)

1. Copy `.env.example` to `.env` in this project folder.
2. Ensure `EXPO_PUBLIC_API_URL` is your API **base including `/api/v1`** (default: `https://api.dropyou.co.uk/api/v1`). All request paths in code are relative to that (e.g. `/auth/login`).
3. Set `EXPO_PUBLIC_CONSUMER_ROLE_ID` to the numeric **CONSUMER** role id from your backend (required for sign-up).
4. For Google sign-in, add Google OAuth client IDs from Google Cloud Console and set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
5. API reference: [Authentication (Swagger)](https://api.dropyou.co.uk/docs#/Authentication).

## 1) Go to project folder

```bash
cd "/Users/imranyasin/Documents/fas/iOS/fas-mobile"
```

## 2) Start Simulator first

```bash
open -a Simulator
```

Wait until the iPhone home screen is fully visible.

## 3) Start Expo

```bash
npm run start
```

Then press `i` in the same terminal to open the app on iOS.

---

## Common Xcode issue and fix

If you see errors like:

- `xcrun simctl help exited with non-zero code: 72`
- `Xcode must be fully installed...`

Run once:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch
```

Verify:

```bash
xcode-select -p
xcrun simctl help
```

Expected:

- Path should be `/Applications/Xcode.app/Contents/Developer`
- `simctl` should show help output

---

## If iOS open times out (code 60)

Sometimes simulator boot is slow. Run:

```bash
xcrun simctl shutdown all
open -a Simulator
```

After simulator is fully booted:

```bash
cd "/Users/imranyasin/Documents/fas/iOS/fas-mobile"
npm run start
```

Press `i`.

---

## Stale Metro warnings or old UI after restart

If the terminal still shows an old warning (for example about `SafeAreaView`) or the bundle looks cached:

```bash
cd "/Users/imranyasin/Documents/fas/iOS/fas-mobile"
npx expo start -c
```

Then press `i` again.
