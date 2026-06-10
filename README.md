# Insightech Alarms Configurator

A web-based alarm configuration tool for industrial automation projects. Engineers select equipment, configure alarm quantities, and export ready-to-use alarm lists in CSV or PLC-native formats (Siemens SCL / Rockwell L5X).

Hosted on GitHub Pages · Backend on Vercel · Private repository · Role-based access

---

## Live App

```
https://miguelfaraj-eng.github.io/alarms_configurator/
```

---

## Repository Structure

```
alarms_configurator/
│
├── index.html                  ← Single-file app (all HTML, CSS, JS)
│
├── api/
│   └── github.js               ← Vercel serverless proxy (keeps PAT secret)
│
├── vercel.json                 ← Vercel deployment config
│
├── data/
│   ├── users.json              ← User accounts (credentials, roles, contact info)
│   └── alarms_template.xlsx   ← Master alarm database (loaded on login)
│
├── assets/
│   └── avatars/                ← User profile pictures (e.g. miguel.jpg)
│
├── Projects/
│   └── <Engineer Name>/
│       └── <Project Reference>/
│           └── project.json    ← Full saved project configuration
│
└── README.md
```

---

## Features

### Authentication
- Login screen with username + SHA-256 hashed password
- Role-based access: **Admin** and **Engineer**
- Forgot password — inline panel on login screen, sends reset request email to admin
- Session stored in `sessionStorage` (clears on tab close)

### Role Permissions

| Feature | Admin | Engineer |
|---|:---:|:---:|
| Dashboard — view own projects | ✅ | ✅ |
| Dashboard — view ALL projects | ✅ | ❌ |
| Configure alarm list (enable/disable/delete) | ✅ | ✅ |
| Export (CSV / Siemens SCL / Rockwell L5X) | ✅ | ✅ |
| Save project to GitHub | ✅ | ✅ |
| Common Alarms wizard | ✅ | ✅ |
| Edit Profile (name, email, phone, photo, password) | ✅ | ✅ |
| Edit alarm names & descriptions | ✅ | ❌ |
| Settings page (import alarm DB) | ✅ | ❌ |
| User Management page | ✅ | ❌ |
| Send credentials to engineers | ✅ | ❌ |

### Dashboard
- Shows all saved projects as cards (engineers see their own, admin sees everyone's)
- Per project: reference, name, client, site, engineer, last saved timestamp, equipment count
- **▶ Open** — restores full configuration back into the wizard
- **🗑 Delete** — removes project from GitHub
- **+ New Project** — resets wizard for a fresh start

### Workflow (4-step wizard)
1. **Project Info** — project name, client, reference, site (engineer name/date auto-filled from login)
2. **Equipment Selection** — choose from 11 categories, 50+ equipment types
3. **Configure** — set quantities per equipment, enable/disable individual alarms by type
4. **Export** — CSV, Siemens SCL, or Rockwell L5X + save project to GitHub

### User Management (Admin)
- Table view of all users with avatar, role, email, phone
- Per-user: 📧 Email credentials, 💬 WhatsApp credentials, 🔑 Send reset request
- Bulk email to all engineers

### Edit Profile (all users)
- Update first/last name, email, phone
- Upload profile photo → saved directly to `assets/avatars/` on GitHub via Vercel proxy
- Change password → SHA-256 hashed and saved to `users.json` on GitHub via Vercel proxy

---

## Architecture

```
Browser (GitHub Pages)
        │
        │  POST /api/github
        │  { method, path, body }
        ▼
Vercel Serverless Function (api/github.js)
        │  PAT stored in Vercel environment variables
        │  Never exposed to the browser
        ▼
GitHub Contents API
        │
        ▼
alarms_configurator repo (users.json, projects, avatars)
```

All write operations (profile edits, project saves, avatar uploads) go through the Vercel proxy. The GitHub PAT never appears in the frontend code.

---

## Setup & Deployment

### 1. Make the repo private

GitHub → repo → **Settings → Danger Zone → Change visibility → Private**

### 2. Enable GitHub Pages

GitHub → repo → **Settings → Pages → Source: Deploy from branch → main → / (root)**

The app will be live at `https://miguelfaraj-eng.github.io/alarms_configurator/`

### 3. Deploy the Vercel proxy

1. Go to **[vercel.com](https://vercel.com)** → sign in with GitHub
2. **Add New → Project** → import `alarms_configurator`
3. Add these **Environment Variables** (Production only):

| Key | Value |
|---|---|
| `GITHUB_PAT` | your fine-grained token `github_pat_...` |
| `GITHUB_REPO` | `miguelfaraj-eng/alarms_configurator` |
| `GITHUB_BRANCH` | `main` |
| `ALLOWED_ORIGIN` | `https://miguelfaraj-eng.github.io` |

4. Click **Deploy**
5. Your API will be live at `https://alarms-configurator.vercel.app/api/github`

### 4. Generate the GitHub PAT

1. **GitHub → Settings → Developer Settings → Personal Access Tokens → Fine-grained tokens → Generate new token**
2. Select repository: `alarms_configurator`
3. **Repository permissions → Contents → Read and Write**
4. Copy the token and add it as `GITHUB_PAT` in Vercel

### 5. Upload the alarm template

Place your alarm Excel file at `data/alarms_template.xlsx`. The app fetches it automatically on login.

Column format:

| Column A | Column B | Column C | Column D | Column E |
|---|---|---|---|---|
| Tag / Group header | Description | Category | Alarm ID | Priority (0 or 5) |

If a row has a tag but no description it is treated as a group header.

---

## Managing Users

Edit `data/users.json` directly in the repo. Each user entry:

```json
{
  "username": "John Doe",
  "passwordHash": "sha256_hash_of_password",
  "password": "plain_text_for_admin_sharing",
  "role": "engineer",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@insightech.com",
  "phone": "+961 70 000 000",
  "picture": "john.jpg"
}
```

**Roles:** `admin` or `engineer`

**Generating a password hash:**
```bash
echo -n "yourpassword" | sha256sum
```

**Adding a profile picture:** upload the image to `assets/avatars/` and set `"picture"` to the filename. Users can also upload their own photo via Edit Profile.

### Current team: 28 users (1 admin, 27 engineers)

---

## Projects Storage

Projects are saved to GitHub under:
```
Projects/<Engineer Full Name>/<Project Reference>/project.json
```

Each `project.json` contains the full configuration snapshot:
- Project info (name, reference, client, site, engineer, date)
- Equipment selections and quantities
- Full alarm states (enabled/disabled/deleted per entity)
- Common alarms
- Metadata (saved at, saved by, version)

---

## Export Formats

| Format | Use case |
|---|---|
| **CSV** | Excel, Google Sheets, any data tool |
| **SCL — Siemens** | TIA Portal / STEP 7 (S7-300/400/1200/1500) |
| **SCL — Rockwell** | Studio 5000 / RSLogix 5000 (Allen-Bradley) |

---

## Tech Stack

- **Pure HTML/CSS/JS** — no framework, no build step
- **Vercel Serverless Functions** — secure GitHub API proxy
- **SheetJS (xlsx.js)** — Excel import/export
- **GitHub Contents API** — project storage, profile saving, avatar upload
- **SHA-256 (Web Crypto API)** — password hashing client-side
- **DM Sans + DM Mono** — typography (Google Fonts)

---

## Contact

**Miguel Faraj** — miguel.faraj@insightech.com  
Insightech · Alarm Configuration System · v10
