<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1ruBByjq3acXC-PBcExa3GTbLZnRS0eGU

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Automatic Deployment Sync

This repository is configured to automatically sync changes to the deployment repository ([aurastudy1](https://github.com/MuhammadHammad9/aurastudy1)) whenever code is pushed to the `main` branch.

### Setup Required

To enable automatic syncing, you need to set up a Personal Access Token (PAT):

1. Go to [GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens)
2. Generate a new token with `repo` scope (full control of private repositories)
3. Go to this repository's Settings > Secrets and variables > Actions
4. Create a new repository secret named `DEPLOYMENT_PAT` with your token as the value

Once configured, any push to the `main` branch will automatically sync all changes to the deployment repository.
