# 📄 Product Requirements Document (PRD)

**Product Name:** WriteWise
**Version:** 1.1
**Owner:** \[Your Name]
**Date:** July 10, 2025

---

## 🔍 Overview

**WriteWise** is a Chrome Extension that rewrites user-provided text into polished, professional, and purpose-driven communication using either **OpenAI’s GPT** or **Google’s Gemini**. It emphasizes privacy, configurability, and speed by running entirely in-browser with user-supplied API keys and stored preferences.

---

## 🎯 Goals

- Provide fast, high-quality rewritten text from rough input
- Support GPT and Gemini via user-provided API keys
- Allow tone, purpose, and context-based rewrites
- Enable users to override prompts without affecting core logic
- Keep all data local for full GDPR/privacy compliance
- Work through extension popup and keyboard shortcut

---

## 👥 Target Audience

- Professionals, freelancers, and students
- Non-native English speakers
- Customer support, marketing, and HR roles
- Anyone writing emails, comments, posts, or formal content

---

## 📐 Features & Functional Requirements

### 🔧 Configuration

| Feature                | Description                                                             |
| ---------------------- | ----------------------------------------------------------------------- |
| API Provider Selection | User selects GPT (OpenAI) or Gemini (Google)                            |
| API Key Entry          | Secure input for API key                                                |
| Connection Tester      | “Test Connection” button validates the key                              |
| Model Fetcher          | Pulls available models (e.g. `gpt-3.5`, `gpt-4`) and populates dropdown |
| Model Selector         | User chooses preferred model                                            |
| Default Tone           | Select tone: Professional, Friendly, Assertive, etc.                    |
| Default Purpose        | Select purpose: Email, Comment, Request, Apology, etc.                  |
| Save Configuration     | Stores all choices locally and marks app as configured                  |

---

### ✍️ Text Input & Generation

| Feature                | Description                                      |
| ---------------------- | ------------------------------------------------ |
| Input Field            | Textarea for user's rough input                  |
| Tone Dropdown          | Auto-filled from saved default but editable      |
| Purpose Dropdown       | Auto-filled from saved default but editable      |
| Optional Context       | (Optional) Textbox to add more detail or nuance  |
| Generate Button        | Sends request to selected model with full prompt |
| Output Display         | Shows the polished version of the input          |
| Copy Button            | Copies the output to clipboard                   |
| Insert Button (future) | Injects text into active field (TBD)             |

---

### 🧠 Prompt Management

| Feature                     | Description                                                          |
| --------------------------- | -------------------------------------------------------------------- |
| Static Prompt File          | Default prompt stored in `prompt.txt` or embedded JS file            |
| Dynamic Placeholder Filling | Prompt populated with `[INPUT]`, `[TONE]`, `[PURPOSE]` at runtime    |
| Editable Session Prompt     | Advanced users can edit prompt in memory (doesn’t overwrite default) |
| Restore Default Prompt      | Reset session prompt to original default                             |
| In-Memory Only              | Edited prompt is not saved; resets on browser refresh or close       |

---

### ⚙️ Settings / Reconfiguration

| Feature             | Description                                                         |
| ------------------- | ------------------------------------------------------------------- |
| View/Update API Key | Change stored key anytime                                           |
| Change Model        | Fetch new list and switch                                           |
| Modify Defaults     | Update default tone and purpose                                     |
| Edit Session Prompt | Edit and override system prompt for current session                 |
| Clear All Data      | Wipes API key, model, preferences, and resets to first-launch state |
| Privacy Notice      | Explains all data is local; GDPR compliant                          |

---

### 🔑 API Key Management

| Feature               | Description                                                                   |
| --------------------- | ----------------------------------------------------------------------------- |
| Validation Request    | GPT: `GET https://api.openai.com/v1/models`                                   |
|                       | Gemini: `GET https://generativelanguage.googleapis.com/v1beta/models?key=...` |
| Error Handling        | Invalid keys return clear error; retry option available                       |
| Storage Location      | Uses `chrome.storage.local` (not `localStorage`)                              |
| No Cloud Transmission | API keys are never sent to external servers or stored remotely                |

---

### ⌨️ Keyboard Shortcut

| Feature       | Description                                                                |
| ------------- | -------------------------------------------------------------------------- |
| Shortcut      | Default: `Ctrl+Shift+P` (customizable via `chrome://extensions/shortcuts`) |
| Action        | Opens the popup as if clicked from toolbar                                 |
| Customization | Users can modify shortcut through Chrome UI                                |

---

### 📜 Extension Manifest (Summary)

- **Manifest V3**
- Permissions:

  - `storage`
  - `activeTab`
  - `scripting`
  - `commands` (for shortcuts)

- Popup: `popup.html`

---

## 🖥️ Screens & UI Elements

### 1. 🔧 Configuration Screen (`popup.html` – first launch)

**Shown if `configured !== true`**

| Element                | Type                             |
| ---------------------- | -------------------------------- |
| AI Provider Selection  | Radio: GPT / Gemini              |
| API Key Field          | Text input                       |
| Test Connection Button | Button                           |
| API Validation Message | Status (✅ or ❌)                |
| Model Selector         | Dropdown (populated dynamically) |
| Tone Selector          | Dropdown                         |
| Purpose Selector       | Dropdown                         |
| Save & Continue Button | Button                           |
| Privacy Notice         | Static text                      |
| Clear All Data Button  | Button                           |

---

### 2. ✍️ Main Input UI (`popup.html` – normal use)

**Shown when `configured === true`**

| Element                | Type                  |
| ---------------------- | --------------------- |
| Input Text Field       | Textarea              |
| Tone Selector          | Dropdown (pre-filled) |
| Purpose Selector       | Dropdown (pre-filled) |
| Optional Context Field | Text input            |
| Generate Button        | Button                |
| Output Display Box     | Static content area   |
| Copy Output Button     | Button                |
| Insert Output Button   | (future)              |
| Edit Prompt Button     | Opens prompt editor   |
| Settings Icon          | Opens settings tab    |

---

### 3. ⚙️ Settings / Prompt Editor Screen (modal or separate tab)

| Element                     | Type               |
| --------------------------- | ------------------ |
| View/Edit API Key           | Text input         |
| Re-test API Key             | Button             |
| Model Reselect              | Dropdown           |
| Default Tone                | Dropdown           |
| Default Purpose             | Dropdown           |
| Prompt Editor               | Multiline textarea |
| Use for This Session Button | Button             |
| Reset to Default Prompt     | Button             |
| Clear All Data              | Button             |
| Save Changes                | Button             |
| Close / Back                | Button             |

---

## 📊 Data Structures

### Stored in `chrome.storage.local`:

```json
{
  "aiService": "gpt",
  "apiKey": "sk-...",
  "availableModels": ["gpt-3.5-turbo", "gpt-4", "gpt-4o"],
  "selectedModel": "gpt-4o",
  "defaultTone": "Professional",
  "defaultPurpose": "Email",
  "configured": true
}
```

### In-memory (session only):

```json
{
  "editedPrompt": "User's modified version of system prompt",
  "lastUsedInput": "Optional: cache last used text",
  "outputCache": "Last generated output"
}
```

---

## 🔐 Privacy & GDPR Compliance

- No external backend or analytics
- No cookies or cloud storage
- API key and config stored only in `chrome.storage.local`
- "Clear all data" available at all times
- Transparent privacy policy in settings/help section

---

## 🧪 Acceptance Criteria

| Feature                | Test                                                           |
| ---------------------- | -------------------------------------------------------------- |
| First-run config       | Shows config screen, validates key, saves prefs                |
| Rewrites text          | Generates output using stored model with selected tone/purpose |
| Custom prompt override | Uses memory-stored prompt if edited                            |
| Storage behavior       | Prefs persist in storage, prompt override does not             |
| Keyboard shortcut      | Opens popup as expected                                        |
| GDPR compliance        | All data remains local, clear opt-out via clear/reset          |

---

## 🧱 Future Enhancements (v2.x and beyond)

- Inline rewrite buttons for Gmail, LinkedIn, etc.
- Message templates (e.g., cold email, follow-up)
- Sentiment analysis preview
- History of polished messages
- AI tone suggestions based on input
- Voice-to-text input
- Sync settings via Chrome account (optional)
- Export/import user profiles
