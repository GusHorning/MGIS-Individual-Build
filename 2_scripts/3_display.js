// PRESENTATION LAYER: Updates the DOM, guitar body outline, tuner circle, and sustained reference tones

const Display = {
  audioCtx: null,
  activeTone: null,
  visualOffset: 0,

  showView(viewName, customTitle) {
    document.querySelectorAll(".view").forEach((el) => el.classList.remove("active"));
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) targetView.classList.add("active");

    const homeBtn = document.getElementById("home-btn");
    const titleEl = document.getElementById("page-title");

    if (viewName === "home") {
      homeBtn.classList.add("hidden");
      titleEl.textContent = "Tune N' Teach";
    } else {
      homeBtn.classList.remove("hidden");
      titleEl.textContent = customTitle || "Tune N' Teach";
    }
  },

  setGuitarBodyShape(guitarType) {
    const frame = document.getElementById("guitar-body-frame");
    frame.classList.remove("acoustic", "electric");
    if (guitarType === "Electric Guitar") {
      frame.classList.add("electric");
    } else {
      frame.classList.add("acoustic");
    }
  },

  setMicButtonState(isListening) {
    const btn = document.getElementById("mic-toggle-btn");
    if (isListening) {
      btn.textContent = "Stop Mic";
      btn.classList.add("listening");
    } else {
      btn.textContent = "Start Mic";
      btn.classList.remove("listening");
    }
  },

  renderStringButtons(strings, selectedIndex, onPressStart, onPressEnd) {
    const container = document.getElementById("string-buttons");
    container.innerHTML = "";
    strings.forEach((str, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `string-btn ${idx === selectedIndex ? "selected" : ""}`;
      btn.textContent = str.note;
      btn.title = `Press and hold to hear ${str.note} (${str.freq} Hz)`;

      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        btn.classList.add("holding");
        if (onPressStart) onPressStart(idx);
      });

      const release = () => {
        btn.classList.remove("holding");
        if (onPressEnd) onPressEnd();
      };

      btn.addEventListener("pointerup", release);
      btn.addEventListener("pointerleave", release);
      btn.addEventListener("pointercancel", release);

      container.appendChild(btn);
    });
  },

  renderPresetDropdown(presets) {
    const select = document.getElementById("preset-select");
    select.innerHTML = "";
    presets.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = preset.name;
      select.appendChild(option);
    });
  },

  updateTunerMeter(targetNote, targetFreq, detectedFreq, evaluation) {
    document.getElementById("target-note-display").textContent = targetNote || "--";
    document.getElementById("target-freq").textContent = targetFreq ? targetFreq.toFixed(1) : "--";
    document.getElementById("detected-freq").textContent = detectedFreq ? detectedFreq.toFixed(1) : "--";
    document.getElementById("status-text").textContent = evaluation.label;

    const circle = document.getElementById("tuning-circle");
    circle.classList.remove("flat", "sharp", "perfect");

    if (evaluation.state !== "idle") {
      circle.classList.add(evaluation.state);
    }

    // Gently glide toward target offset so the circle moves calmly instead of jumping
    if (evaluation.state === "idle") {
      this.visualOffset = 0;
    } else {
      this.visualOffset = this.visualOffset * 0.78 + evaluation.offsetPercent * 0.22;
    }

    // Center is 50%; clamp travel so the circle stays inside the upper guitar bout
    const clampedOffset = Math.max(-28, Math.min(28, this.visualOffset));
    circle.style.left = `calc(50% + ${clampedOffset}%)`;
  },

  // Starts playing a sustained reference tone while the user holds down a string circle
  startReferenceNote(freq) {
    if (!freq) return;
    this.stopReferenceNote();

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!this.audioCtx) {
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const overtone = this.audioCtx.createOscillator();
    const masterGain = this.audioCtx.createGain();
    const overtoneGain = this.audioCtx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);

    overtone.type = "sine";
    overtone.frequency.setValueAtTime(freq * 2, now);

    // Smooth fade-in and sustain until released
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.24, now + 0.04);

    overtoneGain.gain.setValueAtTime(0.05, now);

    osc.connect(masterGain);
    overtone.connect(overtoneGain);
    overtoneGain.connect(masterGain);
    masterGain.connect(this.audioCtx.destination);

    osc.start(now);
    overtone.start(now);

    this.activeTone = { osc, overtone, masterGain };
  },

  // Smoothly stops the sustained reference tone when the user lets go
  stopReferenceNote() {
    if (!this.activeTone || !this.audioCtx) return;

    const { osc, overtone, masterGain } = this.activeTone;
    this.activeTone = null;

    const now = this.audioCtx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(Math.max(masterGain.gain.value, 0.001), now);
    masterGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.12);

    osc.stop(now + 0.14);
    overtone.stop(now + 0.14);
  },

  renderLessons(lessons) {
    const learningList = document.getElementById("list-learning");
    const knownList = document.getElementById("list-known");
    learningList.innerHTML = "";
    knownList.innerHTML = "";

    const learningItems = lessons.filter((l) => l.status !== "known");
    const knownItems = lessons.filter((l) => l.status === "known");

    if (learningItems.length === 0) {
      learningList.innerHTML = `<li class="empty-msg">No lessons added yet.</li>`;
    } else {
      learningItems.forEach((lesson) => learningList.appendChild(this.createLessonItem(lesson)));
    }

    if (knownItems.length === 0) {
      knownList.innerHTML = `<li class="empty-msg">No songs added yet.</li>`;
    } else {
      knownItems.forEach((lesson) => knownList.appendChild(this.createLessonItem(lesson)));
    }
  },

  createLessonItem(lesson) {
    const li = document.createElement("li");
    li.className = "lesson-item";

    const link = document.createElement("a");
    link.href = lesson.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = lesson.title;

    li.appendChild(link);
    return li;
  }
};