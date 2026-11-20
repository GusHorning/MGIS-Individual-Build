// STARTUP: Connects user events, custom tuning creation, per-guitar saved tunings, live mic, and lessons

let currentGuitarType = "Acoustic Guitar";
let currentPreset = null;
let selectedStringIndex = 0;

// Microphone state
let micAudioContext = null;
let micAnalyser = null;
let micStream = null;
let micAnimationId = null;
let isListening = false;
let smoothedFreq = null;

function handleStringPressStart(index) {
  selectedStringIndex = index;
  const activeString = currentPreset.strings[selectedStringIndex];
  Display.startReferenceNote(activeString.freq);

  document.querySelectorAll(".string-btn").forEach((btn, idx) => {
    btn.classList.toggle("selected", idx === selectedStringIndex);
  });

  if (!isListening) {
    Display.updateTunerMeter(activeString.note, activeString.freq, null, {
      offsetPercent: 0,
      state: "idle",
      label: `Playing ${activeString.note} (${activeString.freq} Hz)`
    });
  }
}

function handleStringPressEnd() {
  Display.stopReferenceNote();

  if (!isListening && currentPreset) {
    const activeString = currentPreset.strings[selectedStringIndex];
    Display.updateTunerMeter(activeString.note, activeString.freq, null, {
      offsetPercent: 0,
      state: "idle",
      label: "Tap Start Mic or press and hold a note below"
    });
  }
}

function selectPreset(presetId, shouldSave = true) {
  currentPreset = DataStore.presets.find((p) => p.id === presetId) || DataStore.presets[0];
  if (currentPreset) {
    Display.setSelectedPresetValue(currentPreset.id);
    if (shouldSave && currentGuitarType) {
      DataStore.saveGuitarTuning(currentGuitarType, currentPreset.id);
    }

    selectedStringIndex = 0;
    const firstString = currentPreset.strings[0];
    Display.renderStringButtons(
      currentPreset.strings,
      selectedStringIndex,
      handleStringPressStart,
      handleStringPressEnd
    );
    Display.updateTunerMeter(firstString.note, firstString.freq, null, {
      offsetPercent: 0,
      state: "idle",
      label: isListening ? "Listening — pluck any string" : "Tap Start Mic or press and hold a note below"
    });
  }
}

function listenLoop() {
  if (!isListening || !micAnalyser) return;

  const buffer = new Float32Array(micAnalyser.fftSize);
  micAnalyser.getFloatTimeDomainData(buffer);

  const rawFreq = TunerRules.detectPitch(buffer, micAudioContext.sampleRate);

  if (rawFreq && currentPreset) {
    if (!smoothedFreq || Math.abs(rawFreq - smoothedFreq) > 18) {
      smoothedFreq = rawFreq;
    } else {
      smoothedFreq = smoothedFreq * 0.88 + rawFreq * 0.12;
    }

    const match = TunerRules.findClosestString(smoothedFreq, currentPreset.strings);
    if (match) {
      if (match.index !== selectedStringIndex) {
        selectedStringIndex = match.index;
        Display.renderStringButtons(
          currentPreset.strings,
          selectedStringIndex,
          handleStringPressStart,
          handleStringPressEnd
        );
      }

      const evaluation = TunerRules.evaluatePitch(smoothedFreq, match.stringObj.freq);
      Display.updateTunerMeter(
        match.stringObj.note,
        match.stringObj.freq,
        smoothedFreq,
        evaluation
      );
    }
  }

  micAnimationId = requestAnimationFrame(listenLoop);
}

async function startMicrophone() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("Your browser does not support microphone access here. Try opening on HTTPS or localhost.");
    return;
  }

  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    micAudioContext = new AudioContextClass();
    const source = micAudioContext.createMediaStreamSource(micStream);

    micAnalyser = micAudioContext.createAnalyser();
    micAnalyser.fftSize = 2048;
    source.connect(micAnalyser);

    isListening = true;
    smoothedFreq = null;
    Display.setMicButtonState(true);

    const activeString = currentPreset.strings[selectedStringIndex];
    Display.updateTunerMeter(activeString.note, activeString.freq, null, {
      offsetPercent: 0,
      state: "idle",
      label: "Listening — pluck any string"
    });

    listenLoop();
  } catch (err) {
    alert("Microphone permission was blocked or unavailable. Please allow mic access in your browser settings.");
  }
}

function stopMicrophone() {
  isListening = false;
  smoothedFreq = null;

  if (micAnimationId) {
    cancelAnimationFrame(micAnimationId);
    micAnimationId = null;
  }
  if (micStream) {
    micStream.getTracks().forEach((track) => track.stop());
    micStream = null;
  }
  if (micAudioContext) {
    micAudioContext.close();
    micAudioContext = null;
  }

  Display.setMicButtonState(false);

  if (currentPreset) {
    const activeString = currentPreset.strings[selectedStringIndex];
    Display.updateTunerMeter(activeString.note, activeString.freq, null, {
      offsetPercent: 0,
      state: "idle",
      label: "Mic paused — tap Start Mic or press and hold a note below"
    });
  }
}

function wireModalControls() {
  // Custom Tuning modal open/close
  const openCustomBtn = document.getElementById("open-custom-tuning-btn");
  const closeCustomBtn = document.getElementById("close-custom-tuning-btn");
  const cancelCustomBtn = document.getElementById("cancel-custom-tuning-btn");
  const customModal = document.getElementById("custom-tuning-modal");

  openCustomBtn.addEventListener("click", () => {
    Display.renderCustomStringSelectors(DataStore.availableNotes);
    Display.openModal("custom-tuning-modal");
  });

  [closeCustomBtn, cancelCustomBtn].forEach((btn) => {
    btn.addEventListener("click", () => Display.closeModal("custom-tuning-modal"));
  });

  customModal.addEventListener("click", (e) => {
    if (e.target === customModal) Display.closeModal("custom-tuning-modal");
  });

  // Add Lesson modal open/close
  const openLessonBtn = document.getElementById("open-lesson-modal-btn");
  const closeLessonBtn = document.getElementById("close-lesson-modal-btn");
  const cancelLessonBtn = document.getElementById("cancel-lesson-modal-btn");
  const lessonModal = document.getElementById("lesson-modal");

  openLessonBtn.addEventListener("click", () => {
    Display.renderPresetDropdown(DataStore.presets);
    Display.openModal("lesson-modal");
  });

  [closeLessonBtn, cancelLessonBtn].forEach((btn) => {
    btn.addEventListener("click", () => Display.closeModal("lesson-modal"));
  });

  lessonModal.addEventListener("click", (e) => {
    if (e.target === lessonModal) Display.closeModal("lesson-modal");
  });
}

async function initApp() {
  const presets = await DataStore.loadPresets();
  Display.renderPresetDropdown(presets);
  Display.renderCustomStringSelectors(DataStore.availableNotes);

  if (presets.length > 0) {
    selectPreset(DataStore.getGuitarTuning(currentGuitarType), false);
  }

  Display.renderLessons(DataStore.lessons);
  wireModalControls();

  // Home navigation cards
  document.querySelectorAll(".choice-card").forEach((card) => {
    card.addEventListener("click", () => {
      const target = card.dataset.target;
      const guitarType = card.dataset.guitar;
      if (target === "tuner") {
        currentGuitarType = guitarType;
        Display.setGuitarBodyShape(guitarType);
        const savedPresetId = DataStore.getGuitarTuning(guitarType);
        selectPreset(savedPresetId, false);
      }
      Display.showView(target, guitarType || "Song Lessons");
    });
  });

  // Back to Home button
  document.getElementById("home-btn").addEventListener("click", () => {
    if (isListening) stopMicrophone();
    Display.stopReferenceNote();
    Display.showView("home");
  });

  // Preset dropdown change
  document.getElementById("preset-select").addEventListener("change", (e) => {
    selectPreset(e.target.value, true);
  });

  // Start/Stop Mic button
  document.getElementById("mic-toggle-btn").addEventListener("click", () => {
    if (isListening) {
      stopMicrophone();
    } else {
      startMicrophone();
    }
  });

  // Create Custom Tuning form submit -> immediately updates Acoustic, Electric, and Lessons dropdowns
  document.getElementById("custom-tuning-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const nameInput = document.getElementById("custom-tuning-name");
    const tuningName = nameInput.value.trim();
    if (!tuningName) return;

    const selectedNotes = [];
    for (let stringNum = 6; stringNum >= 1; stringNum--) {
      const select = document.getElementById(`custom-string-${stringNum}`);
      selectedNotes.push(select ? select.value : "E2");
    }

    const newPreset = DataStore.addCustomPreset(tuningName, selectedNotes);
    Display.renderPresetDropdown(DataStore.presets);
    selectPreset(newPreset.id, false);

    e.target.reset();
    Display.closeModal("custom-tuning-modal");
  });

  // Add lesson modal form submit
  document.getElementById("lesson-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("lesson-title").value.trim();
    const url = document.getElementById("lesson-url").value.trim();
    const instrument = document.getElementById("lesson-instrument").value;
    const tuning = document.getElementById("lesson-tuning").value;
    const capo = document.getElementById("lesson-capo").value;
    const status = document.getElementById("lesson-status").value;

    if (!title || !url) return;

    DataStore.addLesson({
      id: Date.now().toString(),
      title,
      url,
      instrument,
      tuning,
      capo,
      status
    });

    Display.renderLessons(DataStore.lessons);
    e.target.reset();
    Display.closeModal("lesson-modal");
  });
}

document.addEventListener("DOMContentLoaded", initApp);