// DATA LAYER: Loads tuning presets, saves/edits/deletes custom tunings, remembers per-guitar tunings, and persists lessons

const DataStore = {
  basePresets: [],
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

  // Per-string realistic note options (Clean note letters only, frequencies handled automatically)
  stringNoteOptions: [
    {
      stringNum: 6,
      defaultNote: "E",
      notes: [
        { note: "C", freq: 65.41 },
        { note: "Db", freq: 69.30 },
        { note: "D", freq: 73.42 },
        { note: "Eb", freq: 77.78 },
        { note: "E", freq: 82.41 },
        { note: "F", freq: 87.31 }
      ]
    },
    {
      stringNum: 5,
      defaultNote: "A",
      notes: [
        { note: "F", freq: 87.31 },
        { note: "Gb", freq: 92.50 },
        { note: "G", freq: 98.00 },
        { note: "Ab", freq: 103.83 },
        { note: "A", freq: 110.00 },
        { note: "Bb", freq: 116.54 },
        { note: "B", freq: 123.47 }
      ]
    },
    {
      stringNum: 4,
      defaultNote: "D",
      notes: [
        { note: "Bb", freq: 116.54 },
        { note: "B", freq: 123.47 },
        { note: "C", freq: 130.81 },
        { note: "Db", freq: 138.59 },
        { note: "D", freq: 146.83 },
        { note: "Eb", freq: 155.56 },
        { note: "E", freq: 164.81 }
      ]
    },
    {
      stringNum: 3,
      defaultNote: "G",
      notes: [
        { note: "E", freq: 164.81 },
        { note: "F", freq: 174.61 },
        { note: "Gb", freq: 185.00 },
        { note: "G", freq: 196.00 },
        { note: "Ab", freq: 207.65 },
        { note: "A", freq: 220.00 }
      ]
    },
    {
      stringNum: 2,
      defaultNote: "B",
      notes: [
        { note: "G", freq: 196.00 },
        { note: "Ab", freq: 207.65 },
        { note: "A", freq: 220.00 },
        { note: "Bb", freq: 233.08 },
        { note: "B", freq: 246.94 },
        { note: "C", freq: 261.63 },
        { note: "D", freq: 293.66 }
      ]
    },
    {
      stringNum: 1,
      defaultNote: "E",
      notes: [
        { note: "C", freq: 261.63 },
        { note: "Db", freq: 277.18 },
        { note: "D", freq: 293.66 },
        { note: "Eb", freq: 311.13 },
        { note: "E", freq: 329.63 },
        { note: "F", freq: 349.23 }
      ]
    }
  ],

  defaultPresets() {
    return [
      {
        id: "standard",
        name: "Standard (E A D G B E)",
        strings: [
          { stringNum: 6, note: "E", freq: 82.41 },
          { stringNum: 5, note: "A", freq: 110.0 },
          { stringNum: 4, note: "D", freq: 146.83 },
          { stringNum: 3, note: "G", freq: 196.0 },
          { stringNum: 2, note: "B", freq: 246.94 },
          { stringNum: 1, note: "E", freq: 329.63 }
        ]
      },
      {
        id: "drop-d",
        name: "Drop D (D A D G B E)",
        strings: [
          { stringNum: 6, note: "D", freq: 73.42 },
          { stringNum: 5, note: "A", freq: 110.0 },
          { stringNum: 4, note: "D", freq: 146.83 },
          { stringNum: 3, note: "G", freq: 196.0 },
          { stringNum: 2, note: "B", freq: 246.94 },
          { stringNum: 1, note: "E", freq: 329.63 }
        ]
      },
      {
        id: "half-step-down",
        name: "Half-Step Down (Eb Ab Db Gb Bb Eb)",
        strings: [
          { stringNum: 6, note: "Eb", freq: 77.78 },
          { stringNum: 5, note: "Ab", freq: 103.83 },
          { stringNum: 4, note: "Db", freq: 138.59 },
          { stringNum: 3, note: "Gb", freq: 185.0 },
          { stringNum: 2, note: "Bb", freq: 233.08 },
          { stringNum: 1, note: "Eb", freq: 311.13 }
        ]
      }
    ];
  },

  loadSavedState() {
    try {
      const savedTunings = localStorage.getItem(this.STORAGE_KEYS.TUNINGS);
      if (savedTunings) {
        this.guitarTunings = { ...this.guitarTunings, ...JSON.parse(savedTunings) };
      }

      const savedCustomPresets = localStorage.getItem(this.STORAGE_KEYS.CUSTOM_PRESETS);
      if (savedCustomPresets) {
        this.customPresets = JSON.parse(savedCustomPresets);
      }

      const savedLessons = localStorage.getItem(this.STORAGE_KEYS.LESSONS);
      if (savedLessons) {
        this.lessons = JSON.parse(savedLessons);
      }
    } catch (err) {
      // Fallback safely if localStorage is restricted
    }
  },

  rebuildPresetsList() {
    this.presets = [...this.basePresets, ...this.customPresets];
  },

  saveCustomPresetsToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEYS.CUSTOM_PRESETS, JSON.stringify(this.customPresets));
    } catch (err) {
      // Ignore storage errors
    }
  },

  async loadPresets() {
    this.loadSavedState();
    this.basePresets = this.defaultPresets();

    try {
      const response = await fetch("1_data/tunings.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load tunings.json");
      const data = await response.json();
      if (data.presets && data.presets.length > 0) {
        this.basePresets = data.presets;
      }
    } catch (err) {
      // Fallback when opened directly from file:// instead of a web server
    }

    this.rebuildPresetsList();
    return this.presets;
  },

  buildStringsFromNotes(selectedNoteLetters) {
    return selectedNoteLetters.map((noteLetter, idx) => {
      const stringConfig = this.stringNoteOptions[idx];
      const match = stringConfig.notes.find((n) => n.note === noteLetter) || stringConfig.notes[0];
      return {
        stringNum: stringConfig.stringNum,
        note: match.note,
        freq: match.freq
      };
    });
  },

  addCustomPreset(customName, selectedNoteLetters) {
    const strings = this.buildStringsFromNotes(selectedNoteLetters);
    const lettersSummary = strings.map((s) => s.note).join(" ");
    const cleanTitle = customName.trim();
    const displayName = `${cleanTitle} (${lettersSummary})`;

    const newPreset = {
      id: `custom-${Date.now()}`,
      title: cleanTitle,
      name: displayName,
      strings
    };

    this.customPresets.push(newPreset);
    this.rebuildPresetsList();
    this.saveCustomPresetsToStorage();
    return newPreset;
  },

  updateCustomPreset(presetId, customName, selectedNoteLetters) {
    const index = this.customPresets.findIndex((p) => p.id === presetId);
    if (index === -1) return null;

    const strings = this.buildStringsFromNotes(selectedNoteLetters);
    const lettersSummary = strings.map((s) => s.note).join(" ");
    const cleanTitle = customName.trim();
    const displayName = `${cleanTitle} (${lettersSummary})`;

    const updatedPreset = {
      ...this.customPresets[index],
      title: cleanTitle,
      name: displayName,
      strings
    };

    this.customPresets[index] = updatedPreset;
    this.rebuildPresetsList();
    this.saveCustomPresetsToStorage();
    return updatedPreset;
  },

  deleteCustomPreset(presetId) {
    this.customPresets = this.customPresets.filter((p) => p.id !== presetId);
    this.rebuildPresetsList();
    this.saveCustomPresetsToStorage();

    // Fall back to Standard if either guitar had this deleted custom tuning active
    Object.keys(this.guitarTunings).forEach((guitarType) => {
      if (this.guitarTunings[guitarType] === presetId) {
        this.saveGuitarTuning(guitarType, "standard");
      }
    });
  },

  getGuitarTuning(guitarType) {
    const savedId = this.guitarTunings[guitarType] || "standard";
    const exists = this.presets.some((p) => p.id === savedId);
    return exists ? savedId : "standard";
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

  saveLessonsToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEYS.LESSONS, JSON.stringify(this.lessons));
    } catch (err) {
      // Ignore storage errors
    }
  },

  addLesson(lesson) {
    this.lessons.push(lesson);
    this.saveLessonsToStorage();
  },

  updateLesson(updatedLesson) {
    const index = this.lessons.findIndex((l) => l.id === updatedLesson.id);
    if (index !== -1) {
      this.lessons[index] = updatedLesson;
      this.saveLessonsToStorage();
    }
  },

  deleteLesson(lessonId) {
    this.lessons = this.lessons.filter((l) => l.id !== lessonId);
    this.saveLessonsToStorage();
  }
};