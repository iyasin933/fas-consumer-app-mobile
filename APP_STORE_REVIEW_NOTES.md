# App Store Review Response Notes

Submission ID: 43ebc09e-0608-40a0-b8c7-0941a27b625e
Review date: June 03, 2026
Version reviewed: 1.0.0 (10)

## Guideline 4.8 - Login Services

The iOS app now offers Sign in with Apple as an equivalent login option on the sign-in screen, alongside Google and email/password login. Sign in with Apple requests only the user's name and email address from Apple and uses the native Apple authentication flow.

## Guideline 5.1.2(i) - Privacy - Data Use and Sharing

Code review found no tracking SDKs, no AppTrackingTransparency prompt, no advertising identifier usage, and no data-broker sharing code path in this mobile app. If DropYou does not link app-collected data with third-party data for advertising or measurement, update App Store Connect App Privacy so the listed data is not marked as "used to track users."

If any tracking exists outside this repository or on another platform, document it in App Review notes and add the AppTrackingTransparency permission flow before collecting tracking data.

## Guideline 5.1.1(ii) - Photo Library Purpose String

The iOS photo library purpose string now explains that users choose a library photo to update the profile picture shown on their account.

## Guideline 5.1.1(v) - Account Deletion

The app now includes an in-app account deletion entry point:

Settings > Account > Delete account

The flow displays a confirmation prompt, calls the authenticated account deletion endpoint, clears local tokens, signs the user out, and clears cached user data.

For resubmission, attach a physical-device screen recording showing:

1. Sign in or create a demo account.
2. Open Settings.
3. Tap Account.
4. Tap Delete account.
5. Confirm deletion and show the signed-out state.
