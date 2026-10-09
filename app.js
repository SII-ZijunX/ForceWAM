"use strict";

// The research content, links, and native video controls also work without JS.
const previewVideos = [...document.querySelectorAll("video[data-preview]")];
const allVideos = [...document.querySelectorAll("video")];
const previewToggle = document.querySelector("#preview-toggle");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const connection = navigator.connection;
const visibleVideos = new Set();
const automaticPauses = new WeakSet();
let previewsEnabled = !reducedMotion.matches && !connection?.saveData;

function pauseVideo(video) {
  if (!video.paused) {
    automaticPauses.add(video);
    video.pause();
  }
}

function startPreview(video) {
  if (previewsEnabled && !document.hidden && visibleVideos.has(video) && !video.dataset.userPaused) {
    video.play().catch(() => {
      // Browser autoplay restrictions leave the native play control available.
    });
  }
}

function updatePreviewButton() {
  previewToggle.textContent = previewsEnabled ? "Pause previews" : "Play previews";
  previewToggle.setAttribute("aria-pressed", String(previewsEnabled));
}

if ("IntersectionObserver" in window) {
  previewToggle.hidden = false;
  updatePreviewButton();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const video = entry.target;
      if (entry.isIntersecting) {
        visibleVideos.add(video);
        if (video.hasAttribute("data-preview")) startPreview(video);
      } else {
        visibleVideos.delete(video);
        pauseVideo(video);
      }
    }
  }, { threshold: 0.25 });
  allVideos.forEach((video) => observer.observe(video));
}

previewVideos.forEach((video) => {
  video.addEventListener("pause", () => {
    if (automaticPauses.has(video)) automaticPauses.delete(video);
    else video.dataset.userPaused = "true";
  });
  video.addEventListener("play", () => { delete video.dataset.userPaused; });
});

previewToggle.addEventListener("click", () => {
  previewsEnabled = !previewsEnabled;
  updatePreviewButton();
  previewVideos.forEach((video) => {
    if (previewsEnabled) {
      delete video.dataset.userPaused;
      startPreview(video);
    } else pauseVideo(video);
  });
});

reducedMotion.addEventListener("change", (event) => {
  if (event.matches) {
    previewsEnabled = false;
    updatePreviewButton();
    previewVideos.forEach(pauseVideo);
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) allVideos.forEach(pauseVideo);
  else previewVideos.forEach(startPreview);
});

const tabList = document.querySelector(".task-tabs");
const tabs = [...tabList.querySelectorAll('[role="tab"]')];
const panels = [...document.querySelectorAll(".task-panel")];

function selectTask(tab, focus = false) {
  tabs.forEach((item) => {
    const selected = item === tab;
    item.setAttribute("aria-selected", String(selected));
    item.tabIndex = selected ? 0 : -1;
  });
  panels.forEach((panel) => {
    const selected = panel.id === tab.getAttribute("aria-controls");
    if (!selected) panel.querySelectorAll("video").forEach(pauseVideo);
    panel.hidden = !selected;
  });
  if (focus) tab.focus();
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectTask(tab));
  tab.addEventListener("keydown", (event) => {
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    selectTask(tabs[next], true);
  });
});
selectTask(tabs[0]);
tabList.hidden = false;

document.querySelectorAll(".video-grid video").forEach((video) => {
  video.addEventListener("play", () => {
    allVideos.forEach((other) => { if (other !== video) pauseVideo(other); });
  });
});

const copyButton = document.querySelector("#copy-citation");
const copyStatus = document.querySelector("#copy-status");
copyButton.hidden = false;
copyButton.addEventListener("click", async () => {
  const code = document.querySelector("#bibtex");
  const citation = code.textContent.trim() + "\n";
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(citation);
    copyStatus.textContent = "Citation copied.";
  } catch {
    const range = document.createRange();
    range.selectNodeContents(code);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    copyStatus.textContent = "Citation selected. Press Ctrl+C (⌘C on Mac), or download the .bib file.";
  }
});
