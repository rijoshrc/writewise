// Entry point for WriteWise popup UI
// UI and logic will be implemented here

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("config-form");
  const testBtn = document.getElementById("testKeyBtn");
  const testResult = document.getElementById("testResult");
  const modelSelect = document.getElementById("model");

  // Load saved config if exists
  chrome.storage.local.get(
    ["provider", "apiKey", "model", "tone", "purpose"],
    (data) => {
      if (data.provider)
        document.querySelector(
          `input[name='provider'][value='${data.provider}']`
        ).checked = true;
      if (data.apiKey) document.getElementById("apiKey").value = data.apiKey;
      if (data.model) modelSelect.value = data.model;
      if (data.tone) document.getElementById("tone").value = data.tone;
      if (data.purpose) document.getElementById("purpose").value = data.purpose;
    }
  );

  // --- API Key Validation and Model Fetching ---
  let lastFetchedModels = [];
  async function validateApiKeyAndFetchModels(provider, apiKey) {
    let url, headers;
    if (provider === "gpt") {
      url = "https://api.openai.com/v1/models";
      headers = { Authorization: `Bearer ${apiKey}` };
    } else if (provider === "gemini") {
      url = "https://generativelanguage.googleapis.com/v1beta/models";
      headers = { "x-goog-api-key": apiKey };
    } else {
      return { valid: false, models: [] };
    }
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) return { valid: false, models: [] };
      const data = await res.json();
      let models = [];
      if (provider === "gpt") {
        models = (data.data || [])
          .filter((m) => m.id.includes("gpt"))
          .map((m) => ({ id: m.id, label: m.id }));
      } else if (provider === "gemini") {
        models = (data.models || [])
          .filter((m) => m.displayName && m.name.includes("models/"))
          .map((m) => ({ id: m.name, label: m.displayName }));
      }
      lastFetchedModels = models; // Save in memory for later use
      return { valid: true, models };
    } catch (e) {
      return { valid: false, models: [] };
    }
  }

  testBtn.addEventListener("click", async () => {
    const provider = document.querySelector(
      'input[name="provider"]:checked'
    ).value;
    const apiKey = document.getElementById("apiKey").value;
    testResult.textContent = "Testing...";
    modelSelect.disabled = true;
    modelSelect.innerHTML = "<option>-- Select Model --</option>";
    const { valid, models } = await validateApiKeyAndFetchModels(
      provider,
      apiKey
    );
    if (valid) {
      testResult.textContent = "Valid!";
      modelSelect.disabled = false;
      modelSelect.innerHTML = models
        .map((m) => `<option value="${m.id}">${m.label}</option>`)
        .join("");
      // Optionally select the first model if none selected
      if (!modelSelect.value && models.length > 0) {
        modelSelect.value = models[0].id;
      }
    } else {
      testResult.textContent = "Invalid key or unable to fetch models";
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const provider = document.querySelector(
      'input[name="provider"]:checked'
    ).value;
    const apiKey = document.getElementById("apiKey").value;
    const model = modelSelect.value;
    const tone = document.getElementById("tone").value;
    const purpose = document.getElementById("purpose").value;
    // Save available models in storage for later use
    chrome.storage.local.set(
      {
        provider,
        apiKey,
        model,
        tone,
        purpose,
        availableModels: lastFetchedModels,
      },
      () => {
        // Show main UI after saving
        showMainUI();
      }
    );
  });

  // --- Main UI Logic ---
  let mainUIListenersAttached = false;
  function showMainUI() {
    document.getElementById("config-form").style.display = "none";
    document.getElementById("main-ui").style.display = "";
    // Load saved tone/purpose
    chrome.storage.local.get(
      ["tone", "purpose", "model", "availableModels"],
      (data) => {
        if (data.tone) document.getElementById("toneMain").value = data.tone;
        if (data.purpose)
          document.getElementById("purposeMain").value = data.purpose;
        // Update model dropdown if available
        if (data.availableModels && Array.isArray(data.availableModels)) {
          const modelSelect = document.getElementById("model");
          if (modelSelect) {
            modelSelect.innerHTML = data.availableModels
              .map((m) => `<option value="${m.id}">${m.label}</option>`)
              .join("");
            if (data.model) modelSelect.value = data.model;
          }
        }
      }
    );
    // Attach listeners only once
    if (!mainUIListenersAttached) {
      attachMainUIListeners();
      mainUIListenersAttached = true;
    }
  }

  // Move all event listener attachment code inside a function
  function attachMainUIListeners() {
    // Only add event listeners if elements exist and are visible
    function safeAddEventListener(id, event, handler) {
      const el = document.getElementById(id);
      if (el) el.addEventListener(event, handler);
    }

    safeAddEventListener("settingsLink", "click", (e) => {
      e.preventDefault();
      showConfigUI();
    });

    safeAddEventListener("generateBtn", "click", async () => {
      const input = document.getElementById("inputText")?.value;
      const tone = document.getElementById("toneMain")?.value;
      const purpose = document.getElementById("purposeMain")?.value;
      const context = document.getElementById("context")?.value;
      if (!input) {
        alert("Please enter some text.");
        document.getElementById("inputText").focus();
        return;
      }
      document.getElementById("outputBox").style.display = "";
      const outputText = document.getElementById("outputText");
      outputText.value = "Generating...";
      outputText.setAttribute("aria-busy", "true");
      document.getElementById("loadingSpinner").style.display = "block";
      // Build prompt
      const prompt = await getCurrentPrompt(input, tone, purpose, context);
      // Get config
      chrome.storage.local.get(
        ["provider", "apiKey", "model", "availableModels"],
        async (cfg) => {
          let url, headers, body;
          let selectedModel = cfg.model;
          // If availableModels exists, ensure selectedModel is valid
          if (
            cfg.availableModels &&
            Array.isArray(cfg.availableModels) &&
            cfg.availableModels.length > 0
          ) {
            const found = cfg.availableModels.find(
              (m) => m.id === selectedModel
            );
            if (!found) selectedModel = cfg.availableModels[0].id;
          }
          if (cfg.provider === "gpt") {
            url = "https://api.openai.com/v1/chat/completions";
            headers = {
              "Content-Type": "application/json",
              Authorization: `Bearer ${cfg.apiKey}`,
            };
            body = JSON.stringify({
              model: selectedModel,
              messages: [
                { role: "system", content: prompt },
                ...(context ? [{ role: "user", content: context }] : []),
              ],
            });
          } else if (cfg.provider === "gemini") {
            const geminiModel = selectedModel.replace(/^models\//, "");
            url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${cfg.apiKey}`;
            headers = { "Content-Type": "application/json" };
            body = JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt + (context ? "\nContext: " + context : "") },
                  ],
                },
              ],
            });
          } else {
            outputText.value = "No provider selected.";
            outputText.setAttribute("aria-busy", "false");
            outputText.setAttribute("aria-live", "assertive");
            document.getElementById("loadingSpinner").style.display = "none";
            return;
          }
          try {
            const res = await fetch(url, { method: "POST", headers, body });
            if (!res.ok) throw new Error("API error");
            const data = await res.json();
            let aiOutput = "";
            if (cfg.provider === "gpt") {
              aiOutput = data.choices?.[0]?.message?.content || "No response.";
            } else if (cfg.provider === "gemini") {
              aiOutput =
                data.candidates?.[0]?.content?.parts?.[0]?.text ||
                "No response.";
            }
            outputText.value = aiOutput;
            outputText.setAttribute("aria-busy", "false");
            outputText.setAttribute("aria-live", "polite");
          } catch (e) {
            outputText.value = "Error: " + (e.message || e);
            outputText.setAttribute("aria-busy", "false");
            outputText.setAttribute("aria-live", "assertive");
          } finally {
            document.getElementById("loadingSpinner").style.display = "none";
          }
        }
      );
    });

    safeAddEventListener("copyBtn", "click", () => {
      const output = document.getElementById("outputText")?.value;
      if (output) navigator.clipboard.writeText(output);
    });

    safeAddEventListener("insertBtn", "click", () => {
      const output = document.getElementById("outputText")?.value;
      if (output) {
        navigator.clipboard.writeText(output);
        alert("Output copied! Paste it where you need.");
      }
    });
  }

  // Add utility classes for button purpose
  function setButtonPurposeClass(btn, purpose) {
    btn.classList.remove(
      "btn-primary",
      "btn-accent",
      "btn-danger",
      "btn-success"
    );
    if (purpose === "primary") btn.classList.add("btn-primary");
    else if (purpose === "accent") btn.classList.add("btn-accent");
    else if (purpose === "danger") btn.classList.add("btn-danger");
    else if (purpose === "success") btn.classList.add("btn-success");
  }

  // Apply classes to all main buttons
  setButtonPurposeClass(document.getElementById("generateBtn"), "primary");
  setButtonPurposeClass(document.getElementById("copyBtn"), "accent");
  setButtonPurposeClass(document.getElementById("insertBtn"), "accent");
  setButtonPurposeClass(document.getElementById("clearDataBtn"), "danger");
  setButtonPurposeClass(document.getElementById("resetPromptBtn"), "danger");

  // --- Prompt Override Logic ---
  // Remove fetch logic and define defaultPrompt directly
  const defaultPrompt = `You are WriteWise, an AI writing assistant. Rewrite the following text/sentence by polishing it. Format it according to the user's selected tone, purpose, and context.\n\nInstructions:\n- Carefully read the input text.\n- Rewrite it to match the specified tone and purpose.\n- Use simple words.\n- Do not add information not present in the input.\n- Output only the improved text.\n- Do not rewrite if the text or sentence if already correct.\n\n[INPUT]\n\nTone: [TONE]\nPurpose: [PURPOSE]\nContext: [CONTEXT]`;
  // Save the loaded prompt to chrome.storage.local for access in the settings page and everywhere else
  chrome.storage.local.set({ defaultPrompt });

  // Load session prompt override if exists
  function loadPromptOverride() {
    chrome.storage.local.get(["promptOverride"], (data) => {
      document.getElementById("promptOverride").value =
        data.promptOverride || "";
    });
  }

  // Save session prompt override
  function savePromptOverride() {
    const val = document.getElementById("promptOverride").value;
    chrome.storage.local.set({ promptOverride: val });
  }

  // Reset prompt override
  function resetPromptOverride() {
    document.getElementById("promptOverride").value = "";
    chrome.storage.local.remove("promptOverride");
  }

  // Attach prompt override listeners
  document
    .getElementById("promptOverride")
    .addEventListener("input", savePromptOverride);
  document
    .getElementById("resetPromptBtn")
    .addEventListener("click", function () {
      if (
        confirm(
          "Are you sure you want to reset the prompt to default? This will remove your session override."
        )
      ) {
        resetPromptOverride();
      }
    });

  // --- Settings Logic ---
  document
    .getElementById("clearDataBtn")
    .addEventListener("click", function () {
      if (
        confirm(
          "Are you sure you want to clear ALL WriteWise data? This will remove your API key, settings, and prompt overrides."
        )
      ) {
        chrome.storage.local.clear(() => {
          document.getElementById("clearDataResult").textContent =
            "All data cleared!";
          setTimeout(() => {
            document.getElementById("clearDataResult").textContent = "";
            location.reload();
          }, 1200);
        });
      }
    });

  // When showing config/settings, load all current values
  function showConfigUI() {
    document.getElementById("config-form").style.display = "";
    document.getElementById("main-ui").style.display = "none";
    loadPromptOverride();
    chrome.storage.local.get(
      ["provider", "apiKey", "model", "tone", "purpose"],
      (data) => {
        if (data.provider)
          document.querySelector(
            `input[name='provider'][value='${data.provider}']`
          ).checked = true;
        if (data.apiKey) document.getElementById("apiKey").value = data.apiKey;
        if (data.model) document.getElementById("model").value = data.model;
        if (data.tone) document.getElementById("tone").value = data.tone;
        if (data.purpose)
          document.getElementById("purpose").value = data.purpose;
      }
    );
  }

  // Use prompt in generation
  function getCurrentPrompt(input, tone, purpose, context) {
    return new Promise((resolve) => {
      chrome.storage.local.get(["promptOverride"], (data) => {
        let prompt = data.promptOverride || defaultPrompt;
        // Replace placeholders only, preserve any other content
        prompt = prompt
          .replace(/\[INPUT\]/g, input)
          .replace(/\[TONE\]/g, tone)
          .replace(/\[PURPOSE\]/g, purpose)
          .replace(/\[CONTEXT\]/g, context || "");
        resolve(prompt);
      });
    });
  }

  // Show config or main UI
  chrome.storage.local.get(["apiKey", "model"], (data) => {
    if (data.apiKey && data.model) {
      showMainUI();
    } else {
      showConfigUI();
    }
  });
});
