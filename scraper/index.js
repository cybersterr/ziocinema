const axios = require("axios");
const fs = require("fs");

const JSON_URL = "https://netx.streamstar18.workers.dev/hot1";
const OUTPUT_FILE = "stream.m3u";

async function convertJsonToM3U() {
  try {
    const { data } = await axios.get(JSON_URL, { responseType: "json" });

    if (!Array.isArray(data)) {
      throw new Error("Invalid JSON format (expected array)");
    }

    let m3u = "#EXTM3U\n";

    let skipFirst = true; // 🔥 skip first entry

    data.forEach((item, index) => {
      if (skipFirst) {
        skipFirst = false;
        return;
      }

      if (!item.m3u8_url) return;

      const name = clean(item.name);
      const logo = item.logo || "";
      const userAgent = item.user_agent || "";
      const headers = item.headers || {};

      // 🔥 Build Kodi header string
      let headerString = "";

      if (userAgent) {
        headerString += `|User-Agent=${encodeURIComponent(userAgent)}`;
      }

      if (headers.Cookie) {
        headerString += `${headerString ? "&" : "|"}Cookie=${encodeURIComponent(headers.Cookie)}`;
      }

      if (headers.Origin) {
        headerString += `&Origin=${encodeURIComponent(headers.Origin)}`;
      }

      if (headers.Referer) {
        headerString += `&Referer=${encodeURIComponent(headers.Referer)}`;
      }

      // 🔥 EXTINF line (ALL in ONE GROUP)
      const finalLogo = logo || "https://latestlogo.com/wp-content/uploads/2024/01/jiocinema-logo.png";

m3u += `#EXTINF:-1 tvg-id="${item.id}" tvg-logo="${finalLogo}" group-title="CS OTT | Jio Cinema",${name}\n`;

      // 🔥 Stream URL + headers
      m3u += `${item.m3u8_url}${headerString}\n`;
    });

    fs.writeFileSync(OUTPUT_FILE, m3u);
    console.log("✅ M3U PLAYLIST GENERATED SUCCESSFULLY");

  } catch (err) {
    console.error("❌ ERROR:", err.message);
  }
}

// 🔧 Clean text
function clean(text) {
  if (!text) return "";
  return text
    .replace(/[^\x20-\x7E]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

convertJsonToM3U();
