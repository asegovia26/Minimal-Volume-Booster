const boosterMap = new WeakMap();

function getMediaElements() {
  return Array.from(document.querySelectorAll("audio, video"));
}

function getAudioContext() {
  if (!window.__volumeBoosterAudioContext) {
    window.__volumeBoosterAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  return window.__volumeBoosterAudioContext;
}

async function ensureAudioReady() {
  const audioContext = getAudioContext();

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  return audioContext;
}

async function setupBoosterForElement(media) {
  if (boosterMap.has(media)) {
    return boosterMap.get(media);
  }

  const audioContext = await ensureAudioReady();
  const source = audioContext.createMediaElementSource(media);
  const gainNode = audioContext.createGain();

  source.connect(gainNode);
  gainNode.connect(audioContext.destination);

  const boosterData = { audioContext, source, gainNode };
  boosterMap.set(media, boosterData);

  return boosterData;
}

async function setBoost(percent) {
  const mediaElements = getMediaElements();

  if (mediaElements.length === 0) {
    return {
      success: false,
      message: "No media elements found."
    };
  }

  const gainValue = Math.max(percent / 100, 0);

  for (const media of mediaElements) {
    const { gainNode } = await setupBoosterForElement(media);
    media.muted = false;
    gainNode.gain.value = gainValue;
  }

  return {
    success: true,
    message: `Boost applied: ${percent}%`,
    elementsFound: mediaElements.length
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "setVolume") {
    setBoost(request.value)
      .then((result) => sendResponse(result))
      .catch((error) => {
        console.error("Error applying boost:", error);
        sendResponse({
          success: false,
          message: "Error applying boost."
        });
      });

    return true;
  }
});