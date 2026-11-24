// PRESENTATION LAYER: Updates the DOM, modals, guitar body outline, tuner circle, and sustained tones

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

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("hidden");
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("hidden");
  },

  renderCustomStringSelectors(stringNoteOptions) {
    const grid = document.getElementById("custom-strings-grid");
    if (!grid) return;
    grid.innerHTML = "";

    stringNoteOptions.forEach((stringConfig) => {
      const wrapper = document.createElement("div");
      wrapper.className = "custom-string-field";

      const label = document.createElement("label");
      label.setAttribute("for", `custom-string-${stringConfig.stringNum}`);
      label.textContent = `String ${stringConfig.stringNum}`;

      const select = document.createElement("select");
      select.id = `custom-string-${stringConfig.stringNum}`;
      select.className = "custom-string-select";

      stringConfig.notes.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.note;
        option.textContent = item.note;
        if (item.note === stringConfig.defaultNote) {
          option.selected = true;
        }
        select.appendChild(option);
      });

      wrapper.appendChild(label);
      wrapper.appendChild(select);
      grid.appendChild(wrapper);
    });
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
      // Strip any legacy octave numbers so old saved presets also show clean letters like "D"
      const cleanNote = str.note.replace(/[0-9]/g, "");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `string-btn ${idx === selectedIndex ? "selected" : ""}`;
      btn.textContent = cleanNote;
      btn.title = `Press and hold to hear ${cleanNote}`;

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
    const tunerSelect = document.getElementById("preset-select");
    const lessonTuningSelect = document.getElementById("lesson-tuning");

    const currentTunerVal = tunerSelect ? tunerSelect.value : "";
    const currentLessonVal = lessonTuningSelect ? lessonTuningSelect.value : "";

    if (tunerSelect) {
      tunerSelect.innerHTML = "";
      presets.forEach((preset) => {
        const option = document.createElement("option");
        option.value = preset.id;
        option.textContent = preset.name;
        tunerSelect.appendChild(option);
      });
      if (currentTunerVal && presets.some((p) => p.id === currentTunerVal)) {
        tunerSelect.value = currentTunerVal;
      }
    }

    if (lessonTuningSelect) {
      lessonTuningSelect.innerHTML = "";
      presets.forEach((preset) => {
        const option = document.createElement("option");
        option.value = preset.name;
        option.textContent = preset.name;
        lessonTuningSelect.appendChild(option);
      });
      if (currentLessonVal && presets.some((p) => p.name === currentLessonVal)) {
        lessonTuningSelect.value = currentLessonVal;
      }
    }
  },

  setSelectedPresetValue(presetId) {
    const select = document.getElementById("preset-select");
    if (select && presetId) {
      select.value = presetId;
    }
  },

  updateTunerMeter(targetNote, targetFreq, detectedFreq, evaluation) {
    const cleanTargetNote = targetNote ? targetNote.replace(/[0-9]/g, "") : "--";
    document.getElementById("target-note-display").textContent = cleanTargetNote;
    document.getElementById("target-freq").textContent = targetFreq ? targetFreq.toFixed(1) : "--";
    document.getElementById("detected-freq").textContent = detectedFreq ? detectedFreq.toFixed(1) : "--";
    document.getElementById("status-text").textContent = evaluation.label;

    const circle = document.getElementById("tuning-circle");
    circle.classList.remove("flat", "sharp", "perfect");

    if (evaluation.state !== "idle") {
      circle.classList.add(evaluation.state);
    }

    if (evaluation.state === "idle") {
      this.visualOffset = 0;
    } else {
      this.visualOffset = this.visualOffset * 0.78 + evaluation.offsetPercent * 0.22;
    }

    const clampedOffset = Math.max(-28, Math.min(28, this.visualOffset));
    circle.style.left = `calc(50% + ${clampedOffset}%)`;
  },

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

  renderLessons(lessons, onEditLesson) {
    const learningList = document.getElementById("list-learning");
    const knownList = document.getElementById("list-known");
    learningList.innerHTML = "";
    knownList.innerHTML = "";

    const learningItems = lessons.filter((l) => l.status !== "known");
    const knownItems = lessons.filter((l) => l.status === "known");

    if (learningItems.length === 0) {
      learningList.innerHTML = `<li class="empty-msg">No lessons added yet.</li>`;
    } else {
      learningItems.forEach((lesson) => learningList.appendChild(this.createLessonItem(lesson, onEditLesson)));
    }

    if (knownItems.length === 0) {
      knownList.innerHTML = `<li class="empty-msg">No songs added yet.</li>`;
    } else {
      knownItems.forEach((lesson) => knownList.appendChild(this.createLessonItem(lesson, onEditLesson)));
    }
  },

  createLessonItem(lesson, onEditLesson) {
    const li = document.createElement("li");
    li.className = "lesson-item";

    const link = document.createElement("a");
    link.href = lesson.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    const titleEl = document.createElement("div");
    titleEl.className = "lesson-title";
    titleEl.textContent = lesson.title;

    const metaEl = document.createElement("div");
    metaEl.className = "lesson-meta";
    const instrument = lesson.instrument || "Acoustic Guitar";
    const tuning = lesson.tuning || "Standard (E A D G B E)";
    const capo = lesson.capo || "No Capo";
    metaEl.textContent = `${instrument} • ${tuning} • ${capo}`;

    link.appendChild(titleEl);
    link.appendChild(metaEl);

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "lesson-edit-btn";
    editBtn.textContent = "Edit";
    editBtn.title = `Edit or delete ${lesson.title}`;
    editBtn.addEventListener("click", () => {
      if (onEditLesson) onEditLesson(lesson);
    });

    li.appendChild(link);
    li.appendChild(editBtn);
    return li;
  }
};