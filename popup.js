// Wait for the DOM to fully load before attaching the event listener
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("imageUpload")
    .addEventListener("change", handleImageUpload);
});

// Update handleImageUpload to pass file directly
async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const fileType = file.type.toLowerCase();
  const validTypes = ["image/jpeg", "image/jpg", "image/png"];
  if (!validTypes.includes(fileType)) {
    alert("只支持 JPG、JPEG 和 PNG 格式的图片");
    return;
  }

  if (file.size > 4 * 1024 * 1024) {
    alert("图片大小不能超过4M");
    return;
  }

  // Add image dimension validation
  const img = new Image();
  const imgPromise = new Promise((resolve) => {
    img.onload = () => {
      const width = img.width;
      const height = img.height;
      const shortSide = Math.min(width, height);
      const longSide = Math.max(width, height);
      const ratio = longSide / shortSide;

      if (shortSide < 30) {
        alert("图片短边至少30px");
        return;
      }
      if (longSide > 4096) {
        alert("图片长边最大4096px");
        return;
      }
      if (ratio > 3) {
        alert("图片长宽比需在3:1以内");
        return;
      }
      resolve();
    };
    img.src = URL.createObjectURL(file);
  });

  const statusDiv = document.getElementById("status");
  statusDiv.textContent = "Processing...";

  try {
    await imgPromise;
    const arrayBuffer = await file.arrayBuffer();
    const imageData = new Uint8Array(arrayBuffer);
    const targetLang = document.getElementById("targetLang").value;
    const result = await translateImage(imageData, file, targetLang);

    document.getElementById(
      "originalText"
    ).textContent = `Original: ${result.src}`;
    document.getElementById(
      "translatedText"
    ).textContent = `Translated: ${result.dst}`;
    statusDiv.textContent = "Done";
  } catch (error) {
    console.error(error);
    statusDiv.textContent = "Error: " + error.message;
  }
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 将 Uint8Array 转换为十六进制字符串
function arrayBufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function translateImage(imageData, file, targetLang) {
  const appid = "20250221002281137";
  const key = "4d0WHGj_y2nuUKP0miVp";
  const salt = Date.now();
  const cuid = "APICUID";
  const mac = "mac";
  const from = "auto";
  const to = targetLang;
  const version = 3;
  const paste = 1;

  // Calculate MD5 of raw image data
  const imageMd5 = CryptoJS.MD5(
    CryptoJS.lib.WordArray.create(imageData)
  ).toString();
  const firstMd5 = CryptoJS.MD5(
    appid + imageMd5 + salt + cuid + mac
  ).toString();
  const sign = CryptoJS.MD5(firstMd5 + key).toString();

  const params = new URLSearchParams({
    from,
    to,
    appid,
    salt,
    sign,
    cuid,
    mac,
    version,
    paste,
  });

  const url = `https://fanyi-api.baidu.com/api/trans/sdk/picture?${params}`;
  const formData = new FormData();
  formData.append("image", file); // Use original file instead of base64

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (data.error_code) {
    throw new Error(data.error_msg || "翻译失败");
  }

  if (data.data && data.data.content && data.data.content.length > 0) {
    return {
      src: data.data.content[0].src,
      dst: data.data.content[0].dst,
    };
  }
  throw new Error("未检测到文本");
}
