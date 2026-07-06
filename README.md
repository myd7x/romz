# ROMZ Backend

Express.js and Mongoose backend for the ROMZ fashion e-commerce platform.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in secrets.

3. Start MongoDB locally or set `MONGODB_URI`.

4. Run the API:

   ```bash
   npm run dev
   ```

5. Check health:

   ```bash
   GET http://localhost:5000/api/v1/health
   ```

## Collaboration

See `AI.md` for the backend phase plan and the checkpoints where Codex should ask before continuing.

## Verification

```bash
npm test
npm audit --omit=dev
```

See `DEPLOYMENT.md` for production deployment steps.
