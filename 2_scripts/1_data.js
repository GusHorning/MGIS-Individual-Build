// DATA LAYER: Loads tuning presets, manages custom tunings, per-guitar saved tunings, and lessons

const DataStore = {
  presets: [],
  customPresets: [],
  lessons: [],
  guitarTunings: {
    "Acoustic Guitar": "standard",
    "Electric Guitar": "standard"
  },

  STORAGE_KEYS: {
    TUNINGS: "tuneNTeach_guitarTunings",
    CUSTOM_PRESETS: "tuneNTeach_customPresets",
    LESSONS: "tuneNTeach_lessons"
  },

  // Musical note options (C2 to E5) for the Custom Tuning note dropdowns
  availableNotes: [
    { note: "C2", freq: 65.41 },
    { note: "C#2 / Db2", shortNote: "Db2", freq: 69.30 },
    { note: "D2", freq: 73.42 },
    { note: "D#2 / Eb2", shortNote: "Eb2", freq: 77.78 },
    { note: "E2", freq: 82.41 },
    { note: "F2", freq: 87.31 },
    { note: "F#2 / Gb2", shortNote: "Gb2", freq: 92.50 },
    { note: "G2", freq: 98.00 },
    { note: "G#2 / Ab2", shortNote: "Ab2", freq: 103.83 },
    { note: "A2", freq: 110.00 },
    { note: "A#2 / Bb2", shortNote: "Bb2", freq: 116.54 },
    { note: "B2", freq: 123.47 },
    { note: "C3", freq: 130.81 },
    { note: "C#3 / Db3", shortNote: "Db3", freq: 138.59 },
    { note: "D3", freq: 146.83 },
    { note: "D#3 / Eb3", shortNote: "Eb3", freq: 155.56 },
    { note: "E3", freq: 164.81 },
    { note: "F3", freq: 174.61 },
    { note: "F#3 / Gb3", shortNote: "Gb3", freq: 185.00 },
    { note: "G3", freq: 196.00 },
    { note: "G#3 / Ab3", shortNote: "Ab3", freq: 207.65 },
    { note: "A3", freq: 220.00 },
    { note: "A#3 / Bb3", shortNote: "Bb3", freq: 233.08 },
    { note: "B3", freq: 246.94 },
    { note: "C4", freq: 261.63 },
    { note: "C#4 / Db4", shortNote: "Db4", freq: 277.18 },
    { note: "D4", freq: 293.66 },
    { note: "D#4 / Eb4", shortNote: "Eb4", freq: 311.13 },
    { note: "E4", freq: 329.63 },
    { note: "F4", freq: 349.23 },
    { note: "F#4 / Gb4", shortNote: "Gb4", freq: 369.99 },
    { note: "G4", freq: 392.00 },
    { note: "G#4 / Ab4", shortNote: "Ab4", freq: 415.30 },
    { note: "A4", freq: 440.00 },
    { note: "A#4 / Bb4", shortNote: "Bb4", freq: 466.16 },
    { note: "B4", freq: 493.88 },
    { note: "C5", freq: 523.25 },
    { note: "D5", freq: 587.33 },
    { note: "E5", freq: 659.25 }
  ],

  defaultPresets() {
    return [
      {
        id: "standard",
        name: "Standard (E A D G B E)",
        strings: [
          { stringNum: 6, note: "E2", freq: 82.41 },
          { stringNum: 5, note: "A2", freq: 110.0 },
          { stringNum: 4, note: "D3", freq: 146.83 },
          { stringNum: 3, note: "G3", freq: 196.0 },
          { stringNum: 2, note: "B3", freq: 246.94 },
          { stringNum: 1, note: "E4", freq: 329.63 }
        ]
      },
      {
        id: "drop-d",
        name: "Drop D (D A D G B E)",
        strings: [
          { stringNum: 6, note: "D2", freq: 73.42 },
          { stringNum: 5, note: "A2", freq: 110.0 },
          { stringNum: 4, note: "D3", freq: 146.83 },
          { stringNum: 3, note: "G3", freq: 196.0 },
          { stringNum: 2, note: "B3", freq: 246.94 },
          { stringNum: 1, note: "E4", freq: 329.63 }
        ]
      },
      {
        id: "half-step-down",
        name: "Half-Step Down (Eb Ab Db Gb Bb Eb)",
        strings: [
          { stringNum: 6, note: "Eb2", freq: 77.78 },
          { stringNum: 5, note: "Ab2", freq: 103.83 },
          { stringNum: 4, note: "Db3", freq: 138.59 },
          { stringNum: 3, note: "Gb3", freq: 185.0 },
          { stringNum: 2, note: "Bb3", freq: 233.08 },
          { stringNum: 1, note: "Eb4", freq: 311.13 }
        ]
      }
    ];
  },

  async loadPresets() {
    let basePresets = [];
    try {
      const response = await fetch("1_data/tunings.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load tunings.json");
      const data = await response.json();
      basePresets = data.presets || this.defaultPresets();
    } catch (err) {
      basePresets = this.defaultPresets();
    }

    this.loadSavedState();
    this.presets = [...basePresets, ...this.customPresets];
    return this.presets;
  },

  loadSavedState() {
    try {
      const savedTunings = localStorage.getItem(this.STORAGE_KEYS.TUNINGS);
      if (savedTunings) {
        this.guitarTunings = { ...this.guitarTunings, ...JSON.parse(savedTunings) };
      }
      const savedCustomPresets = localStorage.getItem(this.STORAGE_KEYS.CUSTOM_PRESETS);
      if (savedCustomPresets) {
        this.customPresets = JSON.parse(savedCustomPresets) || [];
      }
      const savedLessons = localStorage.getItem(this.STORAGE_KEYS.LESSONS);
      if (savedLessons) {
        this.lessons = JSON.parse(savedLessons) || [];
      }
    } catch (err) {
      // Ignore storage errors in private browsing
    }
  },

  addCustomPreset(customName, selectedNoteLabels) {
    const strings = selectedNoteLabels.map((label, idx) => {
      const match = this.availableNotes.find((n) => n.note === label) || this.availableNotes[4];
      return {
        stringNum: 6 - idx,
        note: match.shortNote || match.note,
        freq: match.freq
      };
    });

    const lettersSummary = strings.map((s) => s.note.replace(/[0-9]/g, "")).join(" ");
    const cleanName = customName.trim();
    const displayName = `${cleanName} (${lettersSummary})`;

    const newPreset = {
      id: `custom-${Date.now()}`,
      name: displayName,
      strings
    };

    this.customPresets.push(newPreset);
    this.presets.push(newPreset);

    try {
      localStorage.setItem(this.STORAGE_KEYS.CUSTOM_PRESETS, JSON.stringify(this.customPresets));
    } catch (err) {
      // Ignore storage errors
    }

    return newPreset;
  },

  getGuitarTuning(guitarType) {
    return this.guitarTunings[guitarType] || (this.presets[0] && this.presets[0].id) || "standard";
  },

  saveGuitarTuning(guitarType, presetId) {
    if (!guitarType || !presetId) return;
    this.guitarTunings[guitarType] = presetId;
    try {
      localStorage.setItem(this.STORAGE_KEYS.TUNINGS, JSON.stringify(this.guitarTunings));
    } catch (err) {
      // Ignore storage errors
    }
  },

  addLesson(lesson) {
    this.lessons.push(lesson);
    try {
      localStorage.setItem(this.STORAGE_KEYS.LESSONS, JSON.stringify(this.lessons));
    } catch (err) {
      // Ignore storage errors
    }
  }
};