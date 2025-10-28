const form = document.getElementById("composer");
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const ack = document.getElementById("ack");
const micBtn = document.getElementById("micBtn");
const ttsCheckbox = document.getElementById("tts");

function appendMessage(role, text) {
  // Split reply into points by newlines
  const points = text.split(/\n+/).filter(p => p.trim() !== "");
  points.forEach(point => {
    const li = document.createElement("li");
    li.className = `message ${role}`;
    li.textContent = point.trim();
    messages.appendChild(li);
  });
  messages.scrollTop = messages.scrollHeight;
}

/* Speech recognition (browser API) */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition, isRecognizing = false;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.interimResults = false;

  recognition.onstart = () => { isRecognizing = true; micBtn.textContent = "⏹"; };
  recognition.onend = () => { 
    isRecognizing = false; micBtn.textContent = "🎤";
    if (input.value.trim()) sendMessage(input.value.trim()); 
  };
  recognition.onresult = (event) => { input.value = event.results[0][0].transcript; };
} else { micBtn.disabled = true; }

micBtn.addEventListener("click", () => { if (!recognition) return; isRecognizing ? recognition.stop() : recognition.start(); });

function speak(text) {
  if (!ttsCheckbox.checked) return;
  // Remove emojis for TTS
  const cleanedText = text.replace(/[\u{1F600}-\u{1F6FF}]/gu, "");
  const utter = new SpeechSynthesisUtterance(cleanedText);
  utter.lang = "en-US";
  speechSynthesis.speak(utter);
}

async function sendMessage(text) {
  if (!text) return;
  appendMessage("user", text);
  input.value = "";

  const loading = document.createElement("li");
  loading.className = "message assistant";
  loading.textContent = "Thinking...";
  messages.appendChild(loading);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();
    messages.removeChild(loading);
    appendMessage("assistant", data.reply);
    speak(data.reply);
  } catch (err) {
    if (messages.contains(loading)) messages.removeChild(loading);
    appendMessage("assistant", "⚠️ Could not contact server.");
    console.error(err);
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!ack.checked) return alert("Please acknowledge this is informational only.");
  if (!input.value.trim()) return;
  sendMessage(input.value.trim());
});

