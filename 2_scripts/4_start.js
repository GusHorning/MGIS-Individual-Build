// STARTUP: Connects user events, data, rules, and display

let currentPreset = null;
let selectedStringIndex = 0;

function selectString(index) {
  selectedStringIndex = index;
  const activeString = currentPreset.strings[selectedStringIndex];
  Display.renderStringButtons(currentPreset.strings, selectedStringIndex, selectString);
  Display.updateTunerMeter(activeString.freq, {
    offsetPercent: 0,
    state: "idle",
    label: `Selected ${activeString.note} — ready to tune`
  });
}

function selectPreset(presetId) {
  currentPreset = DataStore.presets.find((p) => p.id === presetId) || DataStore.presets[0];
  if (currentPreset) {
    selectString(0);
  }
}

async function initApp() {
  const presets = await DataStore.loadPresets();
  Display.renderPresetDropdown(presets);
  if (presets.length > 0) {
    selectPreset(presets[0].id);
  }

  Display.renderLessons(DataStore.lessons);

  // Home navigation cards
  document.querySelectorAll(".choice-card").forEach((card) => {
    card.addEventListener("click", () => {
      const target = card.dataset.target;
      const guitarType = card.dataset.guitar;
      Display.showView(target, guitarType || "Song Lessons");
    });
  });

  // Back to Home button
  document.getElementById("home-btn").addEventListener("click", () => {
    Display.showView("home");
  });

  // Preset dropdown change
  document.getElementById("preset-select").addEventListener("change", (e) => {
    selectPreset(e.target.value);
  });

  // Placeholder click for Mic button (next build step)
  document.getElementById("mic-toggle-btn").addEventListener("click", () => {
    alert("Microphone pitch detection is our next build step!");
  });

  // Add lesson form (in-memory for skeleton; localStorage persistence coming next)
  document.getElementById("lesson-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("lesson-title").value.trim();
    const url = document.getElementById("lesson-url").value.trim();
    const status = document.getElementById("lesson-status").value;

    if (!title || !url) return;

    DataStore.lessons.push({
      id: Date.now().toString(),
      title,
      url,
      status
    });

    Display.renderLessons(DataStore.lessons);
    e.target.reset();
  });
}

document.addEventListener("DOMContentLoaded", initApp);