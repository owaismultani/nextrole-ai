# Container publishing

`.github/workflows/docker-build.yml` publishes to the GitHub Container Registry under this repository's own name,
`ghcr.io/owaismultani/nextrole-ai`, using the workflow's built-in token. Docker Hub is an optional mirror: it runs only when
`DOCKER_USERNAME` and `DOCKER_PASSWORD` secrets exist, under the image set in the workflow's `DOCKER_IMAGE`.

## Builds and release safety

`.github/workflows/docker-build.yml` builds AMD64 and ARM64 on matching native runners.
All workflows run on GitHub-hosted runners (`ubuntu-latest`, `ubuntu-24.04-arm`) by default,
so forks work without setup. Setting the repository variable `USE_BLACKSMITH=true` switches
every job to Blacksmith runners (32 vCPU for build/test jobs, 2 vCPU for lightweight jobs) and
swaps in `useblacksmith/checkout`, `useblacksmith/setup-docker-builder`, and
`useblacksmith/build-push-action`. Because `uses:` cannot be an expression, each swapped
action is a pair of steps gated on the variable; keep both halves in sync when editing.

On GitHub-hosted runners, Docker Buildx shares its local cache between steps within a job and
no cache is persisted between workflow runs. On Blacksmith, the builder persists layers and the
Dockerfile's pnpm cache mounts between runs, keyed per architecture (`Dockerfile-amd64`,
`Dockerfile-arm64`).

| Trigger                                         | Action                     | Published aliases                                      | Production deployment                              |
| ----------------------------------------------- | -------------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| Push to `main`                                  | Build AMD64 and ARM64      | `sha-<full-commit>`, `nightly`, timestamped nightly    | No                                                 |
| Manual dispatch, default `release=false`        | Build AMD64 and ARM64      | `sha-<full-commit>`, `canary-<run-id>-<attempt>`       | No                                                 |
| Push of a stable `v*` tag                       | Promote existing SHA image | `latest`, version/major/minor (`v6.0.0`, `v6.0`, `v6`) | When configured: SSH redeploy and Cloudflare purge |
| Push of a prerelease `v*` tag                   | Promote existing SHA image | Prerelease version only (for example, `v6.0.0-rc.1`)   | No                                                 |
| Manual dispatch, `release=true`, branch         | Promote existing SHA image | `latest`                                               | When configured: SSH redeploy and Cloudflare purge |
| Manual dispatch, `release=true`, stable tag     | Promote existing SHA image | `latest`, version/major/minor (`v6.0.0`, `v6.0`, `v6`) | When configured: SSH redeploy and Cloudflare purge |
| Manual dispatch, `release=true`, prerelease tag | Promote existing SHA image | Prerelease version only                                | No                                                 |

Each main push builds its own full commit-SHA image; newer pushes do not cancel earlier
builds. An older build still publishes its SHA and timestamped nightly aliases, but only
the current main HEAD updates the moving `nightly` alias. Architecture-specific build
outputs use `sha-<full-commit>-amd64` and `sha-<full-commit>-arm64`.

Release tags must be `vMAJOR.MINOR.PATCH`, optionally with a prerelease suffix, and match
`package.json` at the tagged commit. Promotion resolves that commit's GHCR
`sha-<full-commit>` image, validates both architectures, and copies the complete image index
within GHCR. It adds no annotations and checks that each resulting alias has the source digest.
Embedded SBOM/provenance manifests and existing digest-addressed signatures stay intact; the
workflow also signs the promoted digest.

If the main build is still running, promotion waits up to 35 minutes for the source images.
Missing images or incomplete indexes fail before aliases move; promotion never falls back to
a rebuild. For an unpublished commit on a ref containing this workflow version, run a
manual `release=false` build at that ref first, then rerun promotion. Historical refs with
older workflow files still run their original workflow; their short SHA tags are not promotion
sources. Keep full SHA images in registry retention policies so commits remain promotable.

Manual `release=true` on main or another branch updates `latest` only, keeping semver
aliases tied to Git releases. To update `latest` to main without rebuilding:

```bash
gh workflow run docker-build.yml --repo reactive-resume/reactive-resume --ref main -f release=true
```

To re-promote an existing stable release, select its Git tag. This updates `latest` and
that release's full/minor/major semver aliases. The tag must match the built `package.json`
version. Prerelease tags update only their prerelease alias and skip production integrations.

```bash
gh workflow run docker-build.yml --repo reactive-resume/reactive-resume --ref v6.0.1 -f release=true
```

SSH redeployment requires `SSH_KEY`, `SSH_HOST`, and `SSH_USER`; Cloudflare purging requires
`CLOUDFLARE_ZONE_ID` and `CLOUDFLARE_API_TOKEN`. Each integration is skipped if any required
secret is missing. Dispatch does not create a Git tag, GitHub release, or version bump.

## Native mobile updates

After successful GHCR publishing, `mobile-update` checks out the same full commit and
publishes an EAS Update using the `EXPO_TOKEN` Actions secret. The token must have access
to Expo account `reactive-resume` and project `5830280e-e1ba-45b7-b9c9-ba048fa3bd4d`.
Missing credentials fail the mobile job without undoing the published Docker image.

- Current-main nightlies, manual canaries, and prereleases publish to the `preview` channel
  using the `preview` EAS environment. Superseded main builds skip mobile publishing.
- Stable promotions publish to `production` using the `production` EAS environment only
  when the SSH redeploy step succeeded. Before publishing, three consecutive probes of
  `https://nextrole.example.com/api/health` must identify this service, report healthy, and match the
  full source commit. Official Docker builds embed `APP_REVISION` for that check.
- Each channel cancels superseded mobile jobs independently; Docker image builds remain
  unaffected. Publishing and deployment are separate operations, so a failed mobile job
  can leave the backend ahead. Fix the failure and rerun the release workflow.

The app uses `expo-updates` with fingerprint runtime compatibility. Generated native
projects and local Forme build output are excluded; the Rust sources and reviewed
prebuilt pin are included. Native changes need a new compatible store build; publishing
an OTA update alone cannot upgrade native code. JavaScript and asset changes are checked
at launch, downloaded in the background, and applied on the next restart.

Before first use, add `EXPO_TOKEN`, create preview/production EAS channels, and distribute
new builds with these channels and update configuration. Existing binaries without
`expo-updates` cannot receive OTA updates. See [mobile release handoff](../contributing/mobile-release-handoff.md#over-the-air-updates)
for setup, rollback, and remaining verification. Keep APIs compatible with older clients
and self-hosted servers; runtime fingerprints only protect the JavaScript/native boundary.

Manual canaries build, publish, merge, and sign images in enabled registries without
running production integrations:

```bash
gh workflow run docker-build.yml --repo reactive-resume/reactive-resume --ref main -f release=false
```

Published images retain SBOMs, maximum provenance, and Cosign signatures. GHCR always uses
the destination repository's `GITHUB_TOKEN` with `packages: write`. GHCR is the primary
registry: builds, indexes, promotion, signing, anonymous-pull verification, and production
deployment depend on it alone. Docker Hub is a best-effort mirror, enabled only when both
`DOCKER_USERNAME` and `DOCKER_PASSWORD` secrets are present. After GHCR is published and
verified, the workflow copies the GHCR index to Docker Hub under the same tags (same digest)
and signs it there; Docker Hub login or mirror failures show as failed steps but never fail
the run. Rerun the workflow to retry a missed mirror. Image references are normalized to
lowercase. New GHCR packages need public visibility, repository linkage,
and Actions access before consumers can pull anonymously.

## Verify an image

Images are signed keylessly with cosign from this repository's workflow:

```bash
cosign verify   --certificate-identity https://github.com/owaismultani/nextrole-ai/.github/workflows/docker-build.yml@refs/heads/main   --certificate-oidc-issuer https://token.actions.githubusercontent.com   ghcr.io/owaismultani/nextrole-ai:latest
```

NextRole AI is built on [Reactive Resume](https://github.com/reactive-resume/reactive-resume). Images published by
that project (`ghcr.io/reactive-resume/reactive-resume`) are separate and don't include NextRole AI's changes.
