// Wait for the DOM to fully load before attaching the event listener
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("imageUpload")
    .addEventListener("change", handleImageUpload);
});

async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (e) {
    const imageDataUrl = e.target.result;
    const statusDiv = document.getElementById("status");
    statusDiv.textContent = "Processing...";

    try {
      // Step 1: Perform OCR with Tesseract.js (assuming English text)
      const {
        data: { text },
      } = await Tesseract.recognize(imageDataUrl, "eng");
      const originalText = text.trim();
      document.getElementById(
        "originalText"
      ).textContent = `Original: ${originalText}`;

      // Step 2: Translate the text using Google Translate API
      const targetLang = document.getElementById("targetLang").value;
      const translatedText = await translateText(originalText, targetLang);
      document.getElementById(
        "translatedText"
      ).textContent = `Translated: ${translatedText}`;

      statusDiv.textContent = "Done";
    } catch (error) {
      console.error(error);
      statusDiv.textContent = "Error: " + error.message;
    }
  };
  reader.readAsDataURL(file);
}

async function translateText(text, targetLang) {
  const apiKey = "YOUR_GOOGLE_API_KEY"; // Replace with your Google Cloud API key
  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: text,
      target: targetLang,
      format: "text",
    }),
  });
  const data = await response.json();
  if (data.data && data.data.translations) {
    return data.data.translations[0].translatedText;
  } else {
    throw new Error(data.error?.message || "Translation failed");
  }
}
