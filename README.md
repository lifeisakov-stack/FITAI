# FITAI — Telegram Mini App + AI bot

Starter project: Next.js app for Vercel, Telegram Mini App entry point, Telegram bot webhook, OpenAI Responses API for coaching and food-photo estimation.

## Included
- Responsive FITAI dashboard (RU-first UI).
- Manual nutrition log with calories and macros.
- Water, weight, steps, sleep, workout checklist.
- AI coach endpoint (`/api/ai`).
- Telegram bot webhook (`/api/telegram/webhook`) for text and food photos.
- Telegram Mini App launch button from `/start`.
- Telegram `initData` signature validation for Mini App AI requests when `TELEGRAM_BOT_TOKEN` is configured.
- Local browser storage for demo data.

## Important current limitations
- The dashboard stores user data in the browser's `localStorage`. It is not yet a multi-device account database and does not sync the bot's chat history with the Mini App.
- Telegram bot replies are stateless; persistent user profiles and cross-device history require a database (e.g. Supabase/Postgres).
- Food photo analysis is an estimate, not a medical or laboratory measurement.
- Configure the bot's Mini App URL with HTTPS (Vercel deployment URL).

## 1. Create GitHub repository
1. Sign in to GitHub and create a new empty repository named `fitai`.
2. Download/unzip this project.
3. Upload the project files to the repository root (not the containing folder).
4. Commit to the `main` branch.

If Git is installed locally:
```bash
git init
git add .
git commit -m "Initial FITAI app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/fitai.git
git push -u origin main
```

## 2. Deploy to Vercel
1. Sign in at https://vercel.com.
2. Choose **Add New → Project** and import the `fitai` GitHub repository.
3. Framework should be detected as **Next.js**. Keep the defaults.
4. Before or after first deployment, open **Project → Settings → Environment Variables** and add:
   - `OPENAI_API_KEY` — your OpenAI API key.
   - `OPENAI_MODEL` — `gpt-4.1-mini` (optional).
   - `TELEGRAM_BOT_TOKEN` — token from @BotFather.
   - `TELEGRAM_WEBHOOK_SECRET` — a random secret string (letters/numbers/underscore/hyphen).
   - `APP_URL` — your final Vercel URL, e.g. `https://fitai-yourname.vercel.app`.
5. Apply variables to Production, Preview and Development as needed.
6. Redeploy after changing environment variables.

**Never** commit `.env.local`, bot tokens or OpenAI keys. Do not prefix secrets with `NEXT_PUBLIC_`.

## 3. Create Telegram bot
1. Open Telegram and message `@BotFather`.
2. Run `/newbot`, choose a display name and username.
3. Copy the bot token into Vercel as `TELEGRAM_BOT_TOKEN`.
4. Set the bot's menu button or Main Mini App to your deployed HTTPS URL in BotFather.
5. Set `APP_URL` to exactly the deployed URL, without a trailing slash.

## 4. Set Telegram webhook
After deployment, run this once in a browser or terminal, replacing placeholders:
```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://YOUR-APP.vercel.app/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
```
Do not share the resulting URL: it contains the bot token. Prefer a terminal or API client and keep it private.
Check webhook status:
```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo
```
This URL also contains the token; keep it private.

## 5. Test
- Open the Vercel URL in a browser: dashboard and manual tracking should work.
- Open your bot and send `/start`.
- Tap **Открыть FITAI** to launch the Mini App.
- In the bot, send a text question.
- Send a clear food photo with or without a caption to test approximate food analysis.
- In the Mini App, open **AI-тренер** and send a question.

## Environment variables
See `.env.example`.

## Security notes
- OpenAI and Telegram secrets are read only by server routes.
- Mini App AI requests validate Telegram's signed `initData` if a bot token is configured.
- Webhook checks Telegram's secret-token header if `TELEGRAM_WEBHOOK_SECRET` is configured.
- For a public production launch, add rate limiting, a persistent database, user consent/privacy policy, data deletion/export, and usage/cost limits.
