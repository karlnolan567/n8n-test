# n8n Local Development Stack

Self-hosted n8n with **Ollama** (free local LLM), **PostgreSQL**, **Qdrant** (local vector store), and sample pipelines for local automation testing.

## Quick start

```bash
# From this directory
docker compose up -d
```

Open **http://localhost:5678** and sign in with:

| | |
|---|---|
| **URL** | http://localhost:5678 |
| **Email** | test@test.com |
| **Password** | `@Passw0rd@` |

On first visit, create the owner account using these credentials if prompted.

| Service | URL |
|---------|-----|
| n8n UI | http://localhost:5678 |
| Ollama API | http://localhost:11434 |
| Qdrant API | http://localhost:6333 |

First startup pulls the `llama3.2`, `qwen2.5-coder:7b`, and `nomic-embed-text` models and imports the sample workflows automatically.

## Commands

```bash
docker compose up -d          # Start
docker compose down           # Stop
docker compose restart        # Restart
docker compose logs -f n8n    # Follow n8n logs
docker compose ps             # Status
docker compose down -v        # Reset everything (deletes data)
```

## Sample workflows

Sample workflows are imported on first run (or import manually from **Workflows → ⋮ → Import from File**):

### 1. Weekly AI News Scraper

**Schedule:** Every Monday at 8:00 (workflow timezone).

- Fetches RSS from TechCrunch AI and arXiv cs.AI
- Filters items from the last 7 days (max **15** most recent — arXiv alone can publish hundreds per week)
- Summarizes with **Ollama** (`llama3.2`) — first run may take **1–3 minutes** on CPU
- Appends each run to a **Google Sheet**

**Output sheet:** [AI News Digest](https://docs.google.com/spreadsheets/d/1ywZducWBYVf4pS34-hu47WJrgNvD3QTtpJk5A3iDW4E/edit?gid=0#gid=0)

Add this header row in **Sheet1** (row 1):

Add this header row in **Sheet1** (row 1) — names must match exactly:

| runDate | itemNumber | title | takeaway |
|---------|------------|-------|----------|

Each bullet from the AI digest becomes its own row. All rows from one run share the same `runDate` (`dd-MM-yyyy HH:mm:ss`) and are numbered `1`, `2`, `3`… so you can group items by run.

If you changed column names after setting up the workflow, update row 1 in the sheet to match the headers above, then re-run.

**To test:** Open workflow → assign Google Sheets credential → **Execute Workflow**.

#### Google Sheets credential setup (required)

Use the same Google account that owns (or can edit) the sheet above.

**Step 1 — Google Cloud project**

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or pick an existing one)

**Step 2 — Enable APIs**

Go to **APIs & Services → Library** and enable:

- **Google Sheets API**
- **Google Drive API** (required by n8n for Sheets access)

**Step 3 — OAuth consent screen**

1. **APIs & Services → OAuth consent screen**
2. User type: **External** (or **Internal** if you use Google Workspace)
3. Fill in app name and your email
4. If External + Testing mode: add your Google account under **Test users**

**Step 4 — OAuth client**

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**
2. Application type: **Web application**
3. Authorized redirect URI (exact):

   ```
   http://localhost:5678/rest/oauth2-credential/callback
   ```

4. Copy the **Client ID** and **Client Secret**

**Step 5 — n8n credential**

1. In n8n: **Credentials → Add credential → Google Sheets OAuth2 API**
2. Choose **OAuth2 (recommended)** / custom OAuth
3. Paste **Client ID** and **Client Secret**
4. Click **Sign in with Google** and approve access
5. Save as e.g. `Google Sheets OAuth2`

**Step 6 — Connect the workflow**

1. Open **01 - Weekly AI News Scraper**
2. Click **Append to Google Sheet** (HTTP Request node)
3. Select your **Google Sheets OAuth2** credential
4. **Execute Workflow** — one row per news item is appended to columns A–D

**Sheet layout (Sheet1, row 1):**

| A: runDate | B: itemNumber | C: title | D: takeaway |
|------------|---------------|----------|-------------|

Add that header row manually if the sheet is empty or still has old column names.

**Common errors**

| Error | Fix |
|-------|-----|
| `redirect_uri_mismatch` | Redirect URI must be exactly `http://localhost:5678/rest/oauth2-credential/callback` |
| Access denied / app not verified | Add your email as a **Test user** on the OAuth consent screen |
| Permission denied on sheet | Share the sheet with the same Google account used in OAuth, or use that account to create the sheet |
| Token expires after 7 days | Reconnect credential (happens in Testing mode) — click credential → **Reconnect** |

### 2. Gmail AI Draft Reply

**Trigger:** New Gmail message (polls every minute when active).

1. Summarize email with Ollama
2. Generate draft reply with Ollama
3. Create **Gmail draft** for human review before sending

**Setup required:**

1. [Google Cloud Console](https://console.cloud.google.com/) → create OAuth client (Web application)
2. Authorized redirect URI: `http://localhost:5678/rest/oauth2-credential/callback`
3. Enable **Gmail API**
4. In n8n: **Credentials → Add → Gmail OAuth2** → connect your account
5. Open workflow → assign credential on **Gmail Trigger** and **Create Gmail Draft** nodes
6. Activate workflow

### 3. Google Sheets → Data Table

**Trigger:** Manual (click **Test workflow**).

- Reads rows from a Google Sheet
- Processes **one row at a time** via Split In Batches
- Inserts mapped fields into an n8n **Data Table**

**Setup required:**

1. Enable **Google Sheets API** in Google Cloud (same OAuth client as Gmail works)
2. n8n: **Credentials → Google Sheets OAuth2**
3. Create a Data Table: **Overview → Data tables → Create** with columns:
   - `row_id` (number), `name`, `email`, `status`, `processed_at`, `raw_json` (text)
4. Open workflow → select your Sheet and Data Table in the nodes
5. Sample sheet columns: `name`, `email`, `status`

### 4. Form Image Generator

**Trigger:** n8n Form at `/form/generate-image` (production URL shown on Form Trigger node).

- User submits an image description (+ optional style)
- Generates image via **Pollinations.ai** (free, no API key)
- Saves JPEG to `./shared/` in this project

**To test:**

1. Activate workflow
2. Open the **Production URL** from the Form Trigger node
3. Submit a description → check `./shared/` for the image

### 5. Intelligent Gmail Labeling

**Trigger:** New Gmail message (polls every minute when active).

- Auto-creates Gmail labels if missing (`Quotation`, `Project progress`, `Inquiry`, `Notification`)
- Categorizes email content with **Ollama** (`llama3.2`)
- Applies matching Gmail labels to the message

**Setup required:**

1. [Google Cloud Console](https://console.cloud.google.com/) → OAuth client (Web application)
2. Authorized redirect URI: `http://localhost:5678/rest/oauth2-credential/callback`
3. Enable **Gmail API**
4. n8n: **Credentials → Gmail OAuth2** and **Ollama** (host `http://ollama:11434`)
5. Import `workflows/05-intelligent-gmail-labeling.json` if not auto-imported
6. Assign credentials on Gmail and Ollama nodes → activate workflow

**Notes:**

- Run from the **Gmail trigger** (not mid-workflow) so labels are created before matching
- The AI must return `{"labels": ["Notification"]}` — the JSON Parser auto-fixes minor format issues
- Customize label names in **Find missing labels**, the AI prompt, and the JSON schema together

### 6. Code Companion — PR & Issue Triage Agent

**Trigger:** GitHub `issues` and `pull_request` events (opened, edited, synchronize, reopened).

An autonomous **AI Agent** (Ollama `qwen2.5-coder:7b`) acts as a local staff engineer:

1. **GitHub Trigger** fires when an issue is opened or a PR is submitted
2. **Code Companion Agent** reads the title/body and decides which tools to call
3. **Code Fetcher Tool** (sub-workflow) pulls raw files, PR diffs, or changed-file patches from GitHub
4. **Architecture RAG** searches a local **Qdrant** vector store loaded with your project guidelines
5. **Post GitHub Comment** publishes structured markdown: root-cause analysis, suggested fix snippet, compliance score, and next steps

**Related workflows (import all three):**

| File | Purpose |
|------|---------|
| `06-code-companion-pr-issue-triage.json` | Main agent workflow |
| `06a-code-fetcher-tool.json` | Sub-workflow tool for GitHub code/diffs |
| `06c-ingest-architecture-docs.json` | One-time doc ingestion into Qdrant |

**Setup required:**

1. Start the stack (includes Qdrant on port 6333):

   ```bash
   docker compose up -d
   ```

2. **GitHub credential** — n8n → **Credentials → GitHub API** (Personal Access Token with `repo` scope for private repos, or `public_repo` for public)

3. **Ollama credential** — **Credentials → Ollama** → Base URL `http://ollama:11434`

4. **Qdrant credential** — **Credentials → Qdrant** → URL `http://qdrant:6333` (no API key needed locally)

5. **Ingest architecture docs** (run once):

   - Open **06c - Ingest Architecture Docs**
   - Assign Ollama + Qdrant credentials
   - Click **Execute Workflow**
   - Default docs live in `./docs/` (e.g. `architecture-guidelines.md`). Add your own markdown files there and re-run.

6. **Configure main workflow:**

   - Open **06 - Code Companion PR and Issue Triage**
   - Set **owner** and **repository** on the GitHub Trigger node
   - Assign GitHub, Ollama, and Qdrant credentials on all nodes
   - On **Code Fetcher Tool**, confirm sub-workflow **06a - Code Fetcher Tool** is selected

7. **Expose webhooks** — GitHub must reach your n8n instance. For local dev, use [ngrok](https://ngrok.com/) or `n8n start --tunnel` and set `WEBHOOK_URL` in `.env` to the public URL.

8. Activate the workflow and open a test issue or PR.

**Model notes:**

- Default coding model: `qwen2.5-coder:7b` (supports tool calling). Alternatives: `deepseek-coder`, `codellama`, or `qwen3:8b`.
- RAG embeddings: `nomic-embed-text` (pulled automatically on first start).
- Local 7B models may stop after the first tool call. If that happens, increase **Max Iterations** on the agent (already set to 15) or switch to a larger tool-capable model.

**Webhook / GitLab alternative:**

Replace the GitHub Trigger with a **Webhook** node and map your provider's payload in **Parse GitHub Event**, or swap in a **GitLab Trigger** node. The agent + tools chain stays the same.

**Sample agent output:**

```markdown
## Root Cause Analysis
The PR modifies the service layer but imports a database client directly in the HTTP handler...

## Suggested Fix
```python
# Move DB access behind UserRepository in services/user_service.py
```

## Architecture Compliance
- **Score:** 72/100
- **Notes:** Violates layering guideline (presentation → service → data).

## Recommended Next Steps
- Refactor handler to call UserService
- Add unit test for the new code path
```

## Free LLM stack

| Use case | Provider | Cost |
|----------|----------|------|
| Text (summarize, reply, triage) | Ollama `llama3.2` / `qwen2.5-coder:7b` in Docker | Free, local |
| Embeddings (RAG) | Ollama `nomic-embed-text` + Qdrant | Free, local |
| Images | Pollinations.ai `flux` model | Free, no key |

Ollama is reachable inside n8n as `http://ollama:11434`. Workflows use HTTP Request nodes so no Ollama credential setup is needed.

To add models:

```bash
docker exec -it ollama ollama pull mistral
```

## Project layout

```
.
├── docker-compose.yml    # n8n + Postgres + Ollama + Qdrant
├── .env                  # Secrets (not committed)
├── docs/                 # Architecture guidelines for RAG ingestion
├── workflows/            # Sample pipeline JSON (auto-imported)
└── shared/               # Generated images land here
```

## Troubleshooting

**Port 5678 in use**

Change the port mapping in `docker-compose.yml`: `"8080:5678"` → open http://localhost:8080

**Ollama timeout / model not found**

```bash
docker compose logs ollama-pull
docker exec -it ollama ollama list
docker exec -it ollama ollama pull llama3.2
```

**Gmail / Google Sheets OAuth fails on localhost**

Ensure redirect URI is exactly `http://localhost:5678/rest/oauth2-credential/callback` and APIs are enabled.

**Gmail labeling: "Model output doesn't fit required format"**

Ollama must return `{"labels": ["Notification"]}` not `["Notification"]`. The workflow enables JSON Parser auto-fix; if it still fails, check the Ollama node is connected to both **Assign labels** and **JSON Parser**.

**Gmail labeling: merge returns no output**

Custom labels must exist in Gmail. The workflow creates them automatically when run from the Gmail trigger. If testing individual nodes, run the ensure-labels chain first.

**Workflows not imported**

```bash
docker compose exec n8n n8n import:workflow --separate --input=/demo-data/workflows
```

**Code Companion: agent skips tools or posts empty comment**

- Confirm `qwen2.5-coder:7b` is pulled: `docker exec -it ollama ollama list`
- Run **06c - Ingest Architecture Docs** before activating the agent
- Check Qdrant has vectors: open http://localhost:6333/dashboard
- Re-link sub-workflow **06a** on the **Code Fetcher Tool** node after import

**Code Companion: GitHub webhook 404**

- n8n must be reachable from the internet; set `WEBHOOK_URL` to your tunnel URL and restart n8n

**Reset and start fresh**

```bash
docker compose down -v
docker compose up -d
```

## Next steps

- Add Slack/email nodes after the news digest
- Swap Pollinations for a local image model if you prefer fully offline generation
- Extend Code Companion with human-in-the-loop approval before posting comments
- Point RAG at your real architecture docs in `./docs/`
