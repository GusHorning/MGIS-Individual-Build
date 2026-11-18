// PROCESSING LAYER: Pitch detection math, auto-string detection, and tuning rules

const TunerRules = {
  // Finds which string in the active preset is closest in frequency to what was plucked
  findClosestString(detectedFreq, strings) {
    if (!detectedFreq || !strings || strings.length === 0) return null;

    let closestIndex = 0;
    let smallestRatio = Infinity;

    strings.forEach((str, idx) => {
      // Compare musical distance (cents/octaves) rather than raw Hz so low and high strings match fairly
      const ratio = Math.abs(Math.log2(detectedFreq / str.freq));
      if (ratio < smallestRatio) {
        smallestRatio = ratio;
        closestIndex = idx;
      }
    });

    return {
      index: closestIndex,
      stringObj: strings[closestIndex]
    };
  },

  // Returns offset (-42 to +42), state ('flat', 'sharp', 'perfect'), and label
  evaluatePitch(detectedFreq, targetFreq) {
    if (!detectedFreq || !targetFreq) {
      return { offsetPercent: 0, state: "idle", label: "Listening..." };
    }

    // Calculate musical cents difference (100 cents = 1 semitone)
    const cents = 1200 * Math.log2(detectedFreq / targetFreq);
    const toleranceCents = 8; // Within 8 cents counts as in tune

    // Map +/- 50 cents (half a semitone) across -42% to +42% horizontal movement
    const rawPercent = (cents / 50) * 42;
    const offsetPercent = Math.max(-42, Math.min(42, rawPercent));

    if (Math.abs(cents) <= toleranceCents) {
      return { offsetPercent: 0, state: "perfect", label: "In Tune!" };
    } else if (cents < 0) {
      return { offsetPercent, state: "flat", label: "Too Flat — Tune Up" };
    } else {
      return { offsetPercent, state: "sharp", label: "Too Sharp — Tune Down" };
    }
  },

  // Autocorrelation algorithm: finds the repeating wave period in microphone audio to get Hz
  detectPitch(buffer, sampleRate) {
    const size = buffer.length;
    let rms = 0;

    for (let i = 0; i < size; i++) {
      rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / size);

    // Ignore quiet background room noise
    if (rms < 0.015) return null;

    // Trim silence from start and end of the audio slice for cleaner wave matching
    let r1 = 0;
    let r2 = size - 1;
    const threshold = 0.2;
    for (let i = 0; i < size / 2; i++) {
      if (Math.abs(buffer[i]) < threshold) {
        r1 = i;
        break;
      }
    }
    for (let i = 1; i < size / 2; i++) {
      if (Math.abs(buffer[size - i]) < threshold) {
        r2 = size - i;
        break;
      }
    }

    const trimmed = buffer.slice(r1, r2);
    const trimmedSize = trimmed.length;
    if (trimmedSize < 32) return null;

    const correlations = new Array(trimmedSize).fill(0);
    for (let lag = 0; lag < trimmedSize; lag++) {
      for (let i = 0; i < trimmedSize - lag; i++) {
        correlations[lag] += trimmed[i] * trimmed[i + lag];
      }
    }

    // Walk past the initial peak at lag 0
    let d = 0;
    while (d < trimmedSize - 1 && correlations[d] > correlations[d + 1]) {
      d++;
    }

    let maxVal = -1;
    let maxPos = -1;
    for (let i = d; i < trimmedSize; i++) {
      if (correlations[i] > maxVal) {
        maxVal = correlations[i];
        maxPos = i;
      }
    }

    if (maxPos <= 0) return null;

    // Parabolic interpolation for smoother sub-Hz accuracy
    let shift = 0;
    if (maxPos > 0 && maxPos < trimmedSize - 1) {
      const y1 = correlations[maxPos - 1];
      const y2 = correlations[maxPos];
      const y3 = correlations[maxPos + 1];
      const denom = 2 * (2 * y2 - y1 - y3);
      if (denom !== 0) {
        shift = (y3 - y1) / denom;
      }
    }

    const freq = sampleRate / (maxPos + shift);

    // Filter out frequencies outside normal guitar range (60 Hz to 1000 Hz)
    if (freq < 60 || freq > 1000) return null;
    return freq;
  }
};