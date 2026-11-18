// STARTUP: Connects user events, live microphone audio, auto-string detection, and display

let currentPreset = null;
let selectedStringIndex = 0;

// Microphone state
let micAudioContext = null;
let micAnalyser = null;
let micStream = null;
let micAnimationId = null;
let isListening = false;
let smoothedFreq = null;

function handleStringTap(index) {
  selectedStringIndex = index;
  const activeString = currentPreset.strings[selectedStringIndex];
  Display.renderStringButtons(currentPreset.strings, selectedStringIndex, handleStringTap);
  Display.playReferenceNote(activeString.freq);

  if (!isListening) {
    Display.updateTunerMeter(activeString.note, activeString.freq, null, {
      offsetPercent: 0,
      state: "idle",
      label: `Playing ${activeString.note} (${activeString.freq} Hz)`
    });
  }
}

function selectPreset(presetId) {
  currentPreset = DataStore.presets.find((p) => p.id === presetId) || DataStore.presets[0];
  if (currentPreset) {
    selectedStringIndex = 0;
    const firstString = currentPreset.strings[0];
    Display.renderStringButtons(currentPreset.strings, selectedStringIndex, handleStringTap);
    Display.updateTunerMeter(firstString.note, firstString.freq, null, {
      offsetPercent: 0,
      state: "idle",
      label: isListening ? "Listening — pluck any string" : "Tap Start Mic or tap a note below"
    });
  }
}

function listenLoop() {
  if (!isListening || !micAnalyser) return;

  const buffer = new Float32Array(micAnalyser.fftSize);
  micAnalyser.getFloatTimeDomainData(buffer);

  const rawFreq = TunerRules.detectPitch(buffer, micAudioContext.sampleRate);

  if (rawFreq && currentPreset) {
    // Smooth frequency changes more heavily so the tuning circle glides calmly
    if (!smoothedFreq || Math.abs(rawFreq - smoothedFreq) > 18) {
      smoothedFreq = rawFreq;
    } else {
      smoothedFreq = smoothedFreq * 0.88 + rawFreq * 0.12;
    }

    const match = TunerRules.findClosestString(smoothedFreq, currentPreset.strings);
    if (match) {
      if (match.index !== selectedStringIndex) {
        selectedStringIndex = match.index;
        Display.renderStringButtons(currentPreset.strings, selectedStringIndex, handleStringTap);
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
      label: "Mic paused — tap Start Mic or tap a note below"
    });
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
      if (target === "tuner") {
        Display.setGuitarBodyShape(guitarType);
      }
      Display.showView(target, guitarType || "Song Lessons");
    });
  });

  // Back to Home button (also stops mic cleanly)
  document.getElementById("home-btn").addEventListener("click", () => {
    if (isListening) stopMicrophone();
    Display.showView("home");
  });

  // Preset dropdown change
  document.getElementById("preset-select").addEventListener("change", (e) => {
    selectPreset(e.target.value);
  });

  // Start/Stop Mic button
  document.getElementById("mic-toggle-btn").addEventListener("click", () => {
    if (isListening) {
      stopMicrophone();
    } else {
      startMicrophone();
    }
  });

  // Add lesson form
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