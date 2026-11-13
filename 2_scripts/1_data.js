// DATA LAYER: Loads tuning presets and manages saved lessons

const DataStore = {
  presets: [],
  lessons: [],

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
    try {
      const response = await fetch("1_data/tunings.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load tunings.json");
      const data = await response.json();
      this.presets = data.presets || this.defaultPresets();
    } catch (err) {
      // Fallback when opened directly from file:// instead of a web server
      this.presets = this.defaultPresets();
    }
    return this.presets;
  }
};