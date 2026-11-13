// PRESENTATION LAYER: Updates the DOM and visual state

const Display = {
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

  renderStringButtons(strings, selectedIndex, onSelect) {
    const container = document.getElementById("string-buttons");
    container.innerHTML = "";
    strings.forEach((str, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `string-btn ${idx === selectedIndex ? "selected" : ""}`;
      btn.textContent = str.note;
      btn.addEventListener("click", () => onSelect(idx));
      container.appendChild(btn);
    });
  },

  updateTunerMeter(targetFreq, evaluation) {
    document.getElementById("target-freq").textContent = targetFreq ? targetFreq.toFixed(2) : "--";
    document.getElementById("status-text").textContent = evaluation.label;

    const circle = document.getElementById("tuning-circle");
    circle.classList.remove("flat", "sharp", "perfect");

    if (evaluation.state !== "idle") {
      circle.classList.add(evaluation.state);
    }

    // Center is 50%; shift left or right by offsetPercent
    circle.style.left = `calc(50% + ${evaluation.offsetPercent}%)`;
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