# Web App

Minimal Express server providing a `/api/chat` endpoint that streams responses from OpenAI.

## Setup

1. Install dependencies

   ```bash
   npm install
   ```

2. Copy the environment file and set your OpenAI API key

   ```bash
   cp apps/web/.env.example apps/web/.env
   # edit apps/web/.env and set OPENAI_API_KEY
   ```

3. Start the server

   ```bash
   npm start --workspace apps/web
   ```

4. Send a chat request

   ```bash
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"Hello"}]}'
   ```

Tokens are streamed back in the response. Each request logs the OpenAI `requestId`.
