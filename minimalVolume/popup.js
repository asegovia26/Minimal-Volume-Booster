const volumeRange = document.getElementById("volumeRange");
const volumeValue = document.getElementById("volumeValue");
const statusText = document.getElementById("status");
const donateBtn = document.getElementById("donateBtn");
const alreadyDonatedBtn = document.getElementById("alreadyDonatedBtn");

const STORAGE_KEYS = {
  volume: "savedVolumeBoost",
  donated: "hasDonated"
};

const BUY_ME_A_COFFEE_URL = "https://buymeacoffee.com/asegovia26";

function updateSliderUI(value) {
  volumeValue.textContent = `${value}%`;

  const min = Number(volumeRange.min);
  const max = Number(volumeRange.max);
  const percent = ((value - min) / (max - min)) * 100;

  volumeRange.style.background = `linear-gradient(
    to right,
    var(--accent) 0%,
    var(--accent) ${percent}%,
    rgba(127, 127, 127, 0.22) ${percent}%,
    rgba(127, 127, 127, 0.22) 100%
  )`;
}

async function getStoredState() {
  const result = await chrome.storage.local.get({
    [STORAGE_KEYS.volume]: 100,
    [STORAGE_KEYS.donated]: false
  });

  return {
    volume: Number(result[STORAGE_KEYS.volume] ?? 100),
    donated: Boolean(result[STORAGE_KEYS.donated])
  };
}

async function saveVolume(value) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.volume]: Number(value)
  });
}

async function saveDonated(value) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.donated]: Boolean(value)
  });
}

function updateDonateButtonState(hasDonated) {
  if (hasDonated) {
    donateBtn.classList.add("is-soft");
    alreadyDonatedBtn.textContent = "Thanks for your support";
  } else {
    donateBtn.classList.remove("is-soft");
    alreadyDonatedBtn.textContent = "I already supported it";
  }
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  return tabs[0];
}

async function applyVolumeRealtime(volume) {
  try {
    const tab = await getActiveTab();

    if (!tab || !tab.id) {
      statusText.textContent = "No active tab found.";
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      action: "setVolume",
      value: Number(volume)
    });

    if (response && response.success) {
      statusText.textContent = `Boost applied: ${volume}%`;
      await saveVolume(volume);
    } else {
      statusText.textContent = "Could not apply the boost on this tab.";
    }
  } catch (error) {
    statusText.textContent = "This page does not allow audio boost.";
    console.error("Error applying realtime boost:", error);
  }
}

volumeRange.addEventListener("input", async () => {
  const value = Number(volumeRange.value);
  updateSliderUI(value);
  await saveVolume(value);
  await applyVolumeRealtime(value);
});

donateBtn.addEventListener("click", async () => {
  try {
    await chrome.tabs.create({ url: BUY_ME_A_COFFEE_URL });
  } catch (error) {
    console.error("Error opening Buy Me a Coffee:", error);
    statusText.textContent = "Could not open donation page.";
  }
});

alreadyDonatedBtn.addEventListener("click", async () => {
  await saveDonated(true);
  updateDonateButtonState(true);
  statusText.textContent = "Thanks for supporting the project.";
});

document.addEventListener("DOMContentLoaded", async () => {
  const state = await getStoredState();
  volumeRange.value = state.volume;
  updateSliderUI(state.volume);
  updateDonateButtonState(state.donated);
  statusText.textContent = "Ready.";
});