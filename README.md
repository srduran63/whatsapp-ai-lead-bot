# WhatsApp AI Lead Bot

Multi-tenant WhatsApp Business bot powered by Claude. It answers customers 24/7, asks the right questions, qualifies each lead, and sends the business owner a WhatsApp alert with the result. Ships with ready-made profiles for **auto body shops** and **law firms**.

## How it works

1. A customer writes to the business's WhatsApp number (text or photo).
2. Meta sends the message to the `/webhook` endpoint. The bot verifies the `X-Hub-Signature-256` HMAC and replies `200` immediately.
3. The `phone_number_id` identifies which client business the message belongs to, so one server can run many businesses.
4. Claude answers using that business's info (services, hours, insurance, warranty…) and asks qualifying questions. Customer photos are sent to Claude as images (e.g. car damage).
5. When it has enough information, Claude calls a tool with a structured result: `califica` (qualified) / `revisar` (needs review) / `no_califica` (not qualified) plus a short reason.
6. The bot saves the lead and notifies the owner on WhatsApp.

## Highlights

- **Webhook security**: HMAC-SHA256 signature check with `timingSafeEqual`, plus Meta verify-token handshake.
- **Reliable delivery**: deduplicates Meta retries by message ID and processes each customer's messages in order with a per-conversation queue.
- **Structured lead qualification**: per-client criteria are injected into the prompt, and Claude returns the result through a JSON-schema tool (enum + reason), not free text.
- **Multi-tenant config**: each business is a JSON file in `clientes/` (profile, WhatsApp number, token env var, business info, qualification criteria, alert recipients).
- **Vision**: customers can send photos and Claude reads them.
- **Privacy by design**: conversations older than 90 days are deleted automatically; includes the privacy, terms, and data-deletion pages Meta requires for app review.
- **Local testing**: chat with the bot from the terminal without WhatsApp.

## Tech Stack

Node.js 22 (ESM) · Express 5 · Anthropic Claude API · Meta WhatsApp Cloud API · SQLite

## Setup

```bash
npm install
cp .env.example .env    # fill in your keys
npm start               # http://localhost:3000
```

1. Create an app in **Meta for Developers** and add the WhatsApp product.
2. Copy the access token, app secret, and phone number ID into `.env` / your client file.
3. Expose your server over HTTPS (e.g. a deployed host or a tunnel) and set the webhook URL to `https://your-domain/webhook` with the same `WHATSAPP_VERIFY_TOKEN`. Subscribe to `messages`.

## Adding a new business

Copy `clientes/demo-taller.json` (auto body shop) or `clientes/demo-abogado.json` (law firm), then edit:

| Field | Purpose |
|---|---|
| `perfil` | Conversation profile: `taller` or `abogado` (in `src/perfiles/`) |
| `whatsapp.phoneNumberId` | The business's WhatsApp number ID from Meta |
| `whatsapp.tokenEnv` | Name of the env var holding its access token |
| `avisos` | Phone numbers that receive lead alerts |
| `negocio` | Business info the bot uses to answer |
| `criterios` | `califica` / `noCalifica` / `revisar` rules |
| `activo` | Turn the client on or off |

## Local testing

```bash
npm run chat     # chat with the bot in the terminal
npm run probar   # run the lead-qualification test scenarios
```

> The bot's conversations and profiles are in Spanish, since it targets Spanish-speaking customers in the Miami area.
