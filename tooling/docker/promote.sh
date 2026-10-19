#!/usr/bin/env bash
set -euo pipefail

# Retag complete GHCR indexes. No rebuilds or annotation changes:
# attestations stay embedded, and digest-addressed Cosign signatures stay valid.
source_tag="sha-${COMMIT_SHA:?}"
images=()
while IFS= read -r image; do
  images+=("$image")
done < <(jq -r '.tags | map(split(":")[0]) | unique[]' <<< "$DOCKER_METADATA_OUTPUT_JSON")
digests=()
deadline=$((SECONDS + 2100))

# Resolve every source before moving any aliases. A tag push can arrive while
# its main build is running, so allow up to 35 minutes for publication.
for image in "${images[@]}"; do
  digest=""
  for ((attempt = 1; attempt <= 71; attempt++)); do
    if digest=$(docker buildx imagetools inspect "$image:$source_tag" --format '{{json .Manifest.Digest}}' | jq -er .); then
      break
    fi
    if ((attempt == 71 || SECONDS >= deadline)); then
      echo "::error::Missing $image:$source_tag. Publish this commit with a main push or release=false dispatch, then rerun promotion."
      exit 1
    fi
    echo "Waiting for $image:$source_tag ($attempt/71)..."
    sleep 30
  done
  docker buildx imagetools inspect "$image@$digest" --raw | jq -e '
    [.manifests[].platform | select(.os == "linux") | .architecture] |
    (index("amd64") != null) and (index("arm64") != null)
  ' > /dev/null
  digests+=("$digest")
done

for index in "${!images[@]}"; do
  image="${images[$index]}"
  digest="${digests[$index]}"
  tags=()
  while IFS= read -r tag; do
    tags+=("$tag")
  done < <(jq -r --arg image "$image" '.tags[] | select(startswith($image + ":"))' <<< "$DOCKER_METADATA_OUTPUT_JSON")
  args=()
  for tag in "${tags[@]}"; do
    args+=(--tag "$tag")
  done
  docker buildx imagetools create "${args[@]}" "$image@$digest"
  for tag in "${tags[@]}"; do
    promoted=$(docker buildx imagetools inspect "$tag" --format '{{json .Manifest.Digest}}' | jq -er .)
    if [[ "$promoted" != "$digest" ]]; then
      echo "::error::Digest changed while promoting $tag: expected $digest, got $promoted"
      exit 1
    fi
  done
  echo "ghcr_digest=$digest" >> "$GITHUB_OUTPUT"
done
