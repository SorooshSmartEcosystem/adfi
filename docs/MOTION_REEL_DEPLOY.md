# Motion-reel deployment — Remotion Lambda setup

Motion-reel rendering happens on AWS Lambda via `@remotion/lambda`,
not on Vercel. Vercel serverless wasn't compatible with shipping the
Remotion + Chromium + ffmpeg + native compositor stack — too many
binary dependencies that the function tracer would silently strip.
Remotion Lambda is purpose-built for this exact problem.

## One-time setup (~30 minutes)

You need an AWS account with permissions to create Lambda functions
and S3 buckets. The Remotion CLI provisions both for you.

### 1. Configure AWS credentials locally

```bash
aws configure
# AWS Access Key ID: <your key>
# AWS Secret Access Key: <your secret>
# Default region: us-east-1   (any region works; pick one close to your users)
# Default output format: json
```

If you don't have the AWS CLI:
```bash
brew install awscli
```

### 2. Create the IAM role + policy Remotion needs

Remotion's CLI does this for you on first deploy. From repo root:

```bash
npx remotion lambda policies role
npx remotion lambda policies user
```

Apply the printed JSON policies in IAM. Or — easier — use the AWS
console wizard the CLI links you to.

### 3. Deploy the render function

```bash
npx remotion lambda functions deploy
```

Output looks like:
```
Function name: remotion-render-4-0-454-mem2048mb-disk2048mb-300sec
```

Copy that function name — it's an env var below.

### 4. Deploy the compositions site

This bundles `packages/motion-reel/src/index.ts` and uploads it as a
static site to S3. Lambda will fetch from this URL when rendering.

```bash
npx remotion lambda sites create packages/motion-reel/src/index.ts \
  --site-name=adfi-motion
```

Output looks like:
```
Site URL: https://remotionlambda-useast1-xxx.s3.us-east-1.amazonaws.com/sites/adfi-motion/index.html
```

Copy that URL — also an env var.

### 5. Set Vercel env vars

Go to Vercel → adfi-web project → Settings → Environment Variables.
Add (all are Sensitive):

| Name                            | Value                                 |
|---------------------------------|---------------------------------------|
| `REMOTION_AWS_REGION`           | `us-east-1` (or wherever you deployed)|
| `REMOTION_LAMBDA_FUNCTION_NAME` | output from step 3                    |
| `REMOTION_LAMBDA_SITE_URL`      | output from step 4                    |
| `REMOTION_AWS_ACCESS_KEY_ID`    | IAM user's access key                 |
| `REMOTION_AWS_SECRET_ACCESS_KEY`| IAM user's secret                     |

Redeploy the Vercel app for the env vars to take effect.

## Updating compositions

Whenever `packages/motion-reel/src/**` changes (new template, prompt
tweak, motion adjustment), redeploy the site:

```bash
npx remotion lambda sites create packages/motion-reel/src/index.ts \
  --site-name=adfi-motion
```

The site URL stays the same — Lambda picks up the new bundle.
The `--site-name` is the same so the URL doesn't change.

The function (`functions deploy`) only needs redeploying when
Remotion itself updates (major version bumps).

## Cost

- Lambda: ~$0.0000167 per GB-second of execution
- Default 2GB memory × 30s render ≈ $0.001 per render
- S3 storage + bandwidth: negligible (~$0.05/GB transfer out)
- 100 videos/day → ~$3-5/month total AWS bill

Free tier (first 12 months of AWS account): 1M Lambda requests +
400k GB-seconds free. That's more renders than ADFI will hit early
on, so practical month-1 cost is $0.

## Operations

### Inspect renders
```bash
npx remotion lambda renders ls
npx remotion lambda renders info <renderId>
```

### Cleanup old artifacts
```bash
npx remotion lambda renders rm <renderId>
# or rm-all in a region:
npx remotion lambda compositions rm-all
```

S3 lifecycle rules can auto-delete old renders — see
https://www.remotion.dev/docs/lambda/cleaning-up

### Regional outage fallback
If your default region has an issue, change `REMOTION_AWS_REGION`
in Vercel and redeploy the function + site to a different region.
The route reads the region from env so no code change needed.

## Why not Vercel for rendering

After multiple debug rounds we hit:
- `@sparticuz/chromium`'s `executablePath` losing `this`-binding
- Native compositor binaries stripped by Vercel's tracer
- `@orb/motion-reel` workspace package not appearing in function bundles
  even with `outputFileTracingIncludes` configured
- Build artifact directories silently dropped

Each fix revealed another layer. Remotion Lambda eliminates all of
this — the heavy lifting runs in an environment built for it.
