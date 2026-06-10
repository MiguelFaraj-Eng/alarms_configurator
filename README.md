# Insightech Alarms Configurator

A web-based alarm configuration tool for industrial automation projects. Engineers select equipment, configure alarm quantities, and export ready-to-use alarm lists in CSV or PLC-native formats (Siemens SCL / Rockwell L5X).

Hosted on GitHub Pages · Private repository · Role-based access

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
├── data/
│   ├── users.json              ← User accounts (credentials, roles, contact info)
│   └── alarms_template.xlsx   ← Master alarm database (loaded on login)
│
├── assets/
│   └── avatars/                ← User profile pictures (e.g. miguel.jpg)
│
└── README.md
```

---

## Features

### Authentication
- Login screen with username + SHA-256 hashed password
- Role-based access: **Admin** and **Engineer**
- Forgot password flow — sends a reset request email to the admin
- Session stored in `sessionStorage` (clears on tab close)

### Role Permissions

| Feature | Admin | Engineer |
|---|:---:|:---:|
| Configure alarm list (enable/disable/delete) | ✅ | ✅ |
| Export (CSV / Siemens SCL / Rockwell L5X) | ✅ | ✅ |
| Common Alarms wizard | ✅ | ✅ |
| Edit alarm names & descriptions | ✅ | ❌ |
| Settings page (import alarm DB) | ✅ | ❌ |
| User Management page | ✅ | ❌ |
| Send credentials to engineers | ✅ | ❌ |

### Workflow (4-step wizard)
1. **Project Info** — project name, client, reference, site (engineer name/date auto-filled from login)
2. **Equipment Selection** — choose from 11 categories, 50+ equipment types
3. **Configure** — set quantities per equipment, enable/disable individual alarms by type
4. **Export** — CSV, Siemens SCL, or Rockwell L5X

### User Management (Admin)
- Table view of all users with avatar, role, email, phone
- Per-user: 📧 Email credentials, 💬 WhatsApp credentials, 🔑 Send reset request
- Bulk email to all engineers

### Edit Profile (all users)
- Update first/last name, email, phone
- Upload profile photo → saved directly to `assets/avatars/` on GitHub
- Change password → hashed and saved to `users.json` on GitHub
- Requires a GitHub Personal Access Token (PAT) — see setup below

---

## Setup & Deployment

### 1. Make the repo private

GitHub → repo → **Settings → Danger Zone → Change visibility → Private**

> ⚠ The repo must be private because the GitHub PAT used for profile editing is stored in the browser and could otherwise be read by anyone.

### 2. Enable GitHub Pages

GitHub → repo → **Settings → Pages → Source: Deploy from branch → main → / (root)**

The app will be live at `https://miguelfaraj-eng.github.io/alarms_configurator/`

### 3. Upload the alarm template

Place your alarm Excel file at:
```
data/alarms_template.xlsx
```
The app fetches this file automatically on login. Each sheet tab = one equipment type. Column format:

| Column A | Column B | Column C | Column D | Column E |
|---|---|---|---|---|
| Tag / Group header | Description | Category | Alarm ID | Priority (0 or 5) |

If a row has a tag but no description, it's treated as a **group header**.

### 4. Configure the GitHub PAT (for profile editing)

1. Go to **GitHub → Settings → Developer Settings → Personal Access Tokens → Fine-grained tokens → Generate new token**
2. Set expiry, select repository: `alarms_configurator`
3. Under **Repository permissions** → **Contents** → **Read and Write**
4. Copy the token (starts with `github_pat_...`)
5. In the app: log in as Admin → **Settings → GitHub Token** → paste and click **Save Token**

The token is tested live — the app will tell you exactly what's wrong if it fails (401 = invalid, 403 = missing permissions, 404 = wrong repo).

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

**Generating a password hash** (run in terminal):
```bash
echo -n "yourpassword" | sha256sum
```

**Adding a profile picture:**
Upload the image to `assets/avatars/` and set `"picture"` to the filename.

### Current team: 28 users (1 admin, 27 engineers)

---

## Export Formats

| Format | Use case |
|---|---|
| **CSV** | Excel, Google Sheets, any data tool |
| **SCL — Siemens** | TIA Portal / STEP 7 (S7-300/400/1200/1500) |
| **SCL — Rockwell** | Studio 5000 / RSLogix 5000 (Allen-Bradley) |

All exports include: project info header, equipment list with quantities, full alarm definitions respecting any deletions made in the configure step.

---

## Common Alarms Wizard

Accessible from the Configure page. Generates project-level alarms (not per-equipment) for:

- INSIGHTECH panel batteries, UPS, UPS Buffer
- Robot panels (batteries per panel)
- Per-equipment: batteries, UPS, UPS Buffer, temperature sensors, guard switches, light barriers, safety valves
- Per-line: batteries, UPS, temperature sensors, pneumatic pressure sensors, emergency stops, rope pulls, light barriers
- Zone feedback lines

---

## Tech Stack

- **Pure HTML/CSS/JS** — no framework, no build step, no server
- **SheetJS (xlsx.js)** — Excel import/export
- **GitHub Contents API** — profile saving, avatar upload
- **SHA-256 (Web Crypto API)** — password hashing client-side
- **DM Sans + DM Mono** — typography (Google Fonts)

---

## Contact

**Miguel Faraj** — miguelfaraj@outlook.com 
Insightech · Alarm Configuration System · v10
