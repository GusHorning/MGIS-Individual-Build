// PROCESSING LAYER: Rules for comparing frequencies and calculating tuning state

const TunerRules = {
  // Returns offset (-50 to +50), state ('flat', 'sharp', 'perfect'), and label
  evaluatePitch(detectedFreq, targetFreq) {
    if (!detectedFreq || !targetFreq) {
      return { offsetPercent: 0, state: "idle", label: "Listening..." };
    }

    const diff = detectedFreq - targetFreq;
    const tolerance = 1.5; // Hz tolerance for "in tune"

    // Clamp visual offset between -45% and +45% from center
    const rawPercent = (diff / (targetFreq * 0.08)) * 45;
    const offsetPercent = Math.max(-45, Math.min(45, rawPercent));

    if (Math.abs(diff) <= tolerance) {
      return { offsetPercent: 0, state: "perfect", label: "In Tune!" };
    } else if (diff < 0) {
      return { offsetPercent, state: "flat", label: "Too Flat (Tune Up)" };
    } else {
      return { offsetPercent, state: "sharp", label: "Too Sharp (Tune Down)" };
    }
  }
};