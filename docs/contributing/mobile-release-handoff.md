# Mobile release handoff

NextRole AI is not published to the App Store or Google Play. The native app in `apps/mobile` still carries the
identifiers it inherited from [Reactive Resume](https://github.com/reactive-resume/reactive-resume): the bundle ID and
Android package `me.rxresu`, its Apple Services ID, its EAS project and its store listings. Those belong to that project.

To publish NextRole AI to the stores, first set your own:

- Apple team, bundle identifier and Services ID, and an Android package name, in `apps/mobile/app.config.ts`.
- An EAS project (`eas init`) and its credentials (`eas credentials`).
- The `MOBILE_IOS_APP_IDS`, `MOBILE_ANDROID_PACKAGES` and `MOBILE_ANDROID_SHA256_FINGERPRINTS` server variables, so the
  server's association files match the new identifiers (see [environment variables](../self-hosting/environment-variables.mdx)).
- Store listings, screenshots, privacy answers and a reviewer account in App Store Connect and the Play Console.

## Releasing a new version

Decide first whether the change needs a store build. Run this from `apps/mobile`:

```sh
eas fingerprint:compare --build-id <EAS build ID of the current store binary>
```

**Fingerprint unchanged (JavaScript-only change):** no store work. A stable Docker release publishes the update to the `production` channel after the deployment health probes pass. Apps download it on launch and apply it on the next restart. OTA updates must not change the app's primary purpose or add features that need new store declarations; ship those through review.

**Fingerprint changed (native change):** build and submit new binaries.

1. Deploy the backend first. Keep the API backward compatible: older binaries and OTA bundles remain in use.
2. Optionally bump `version` in `apps/mobile/app.config.ts` (for example `1.0.0` to `1.1.0`). Do not edit build numbers: `appVersionSource` is `remote` and the production profile auto-increments the iOS build number and Android `versionCode`. iOS needs a new version string after a version is released; Play needs only a higher `versionCode`.
3. Build both platforms:

   ```sh
   EXPO_NO_CAPABILITY_SYNC=1 eas build --profile production --platform all
   ```

   Always set `EXPO_NO_CAPABILITY_SYNC=1` for iOS builds and `eas credentials`. The app has no native Sign in with Apple entitlement (Apple sign-in runs through the web flow), so capability sync tries to turn Sign in with Apple off for the app's App ID. Apple refuses because the Services ID uses that App ID as its primary app, and turning it off would break Apple sign-in. Manage capabilities manually in the Apple developer console.

4. Submit the latest builds. Use `--auto-submit` on the build command to combine steps 3 and 4.

   ```sh
   eas submit --profile production --platform ios --latest
   eas submit --profile production --platform android --latest
   ```

   Both platforms submit with keys stored in EAS credentials, so submission also works from CI: the App Store Connect API key for iOS, and the Google service-account key (scoped to this app with release-to-testing permission in Play Console) for Android. `eas.json` holds no credential paths. Never commit credential files.

5. **App Store Connect:** wait for processing, test through TestFlight, create the new app version, attach the build, write "What's New", and submit for review. Release manually or automatically after approval.
6. **Play Console:** the build lands in the `internal` track as a draft. Roll it out to testers, then promote it to production with release notes. Use a staged rollout for risky changes.
7. Test the store-installed builds on real devices (sign-in, sync, PDF export, notifications) before promoting to production.
8. Confirm that a later OTA update reaches the new binary, because its fingerprint and runtime version changed.

Distribution is store-only. No IPA, AAB, or APK is attached to GitHub Releases. An IPA cannot be installed outside the App Store or TestFlight, and an AAB cannot be installed directly. A sideloaded APK would need a separate build profile and signing key. It could not upgrade a Play install or be upgraded by one, so users would lose local drafts on switching. Its certificate fingerprint would also need adding to `MOBILE_ANDROID_CERT_SHA256` for App Links and native sign-in to work.

## Feature parity exceptions

- Applications CSV import/export is web-only on mobile by owner decision, 2026-10-19.
