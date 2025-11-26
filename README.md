<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1o3ff8EzlWEDI0N6QP_6AX2GGNA59YTyV

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the following environment variables in a `.env.local` file in the project root:
   ```
   VITE_SUPABASE_URL="YOUR_SUPABASE_URL"
   VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
   VITE_GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
   ```
   Replace `YOUR_SUPABASE_URL`, `YOUR_SUPABASE_ANON_KEY`, and `YOUR_GEMINI_API_KEY` with your actual keys.
   
   **Important:** All client-side environment variables for Vite MUST be prefixed with `VITE_`.
3. Run the app:
   `npm run dev`