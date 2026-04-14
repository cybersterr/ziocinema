const axios = require("axios");
const fs = require("fs");

const STREAM_URL = "https://hotstar.droozy.workers.dev/";
const OUTPUT_FILE = "stream.json";

async function fetchAndSaveJson() {
  try {
    const response = await axios.get(STREAM_URL, { responseType: "text" });
    const lines = response.data.split("\n");

    const result = {};

    let currentLogo = null;
    let currentChannel = null;
    let currentUserAgent = null;
    let currentHeaders = {};

    let collectingHeaders = false;
    let headerBuffer = "";

    let skipFirst = true;
    let counter = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 🔹 EXTINF (basic info)
      if (line.startsWith("#EXTINF:")) {
        const logoMatch = line.match(/tvg-logo="([^"]+)"/);
        const channelMatch = line.match(/,(.*)$/);

        currentLogo = logoMatch ? logoMatch[1] : null;
        currentChannel = channelMatch ? cleanText(channelMatch[1]) : null;
      }

      // 🔹 USER AGENT
      else if (line.startsWith("#EXTVLCOPT")) {
        const uaMatch = line.match(/http-user-agent=(.*)/);
        currentUserAgent = uaMatch ? uaMatch[1].trim() : null;
      }

      // 🔹 START HEADER COLLECTION (handles broken JSON)
      else if (line.startsWith("#EXTHTTP")) {
        collectingHeaders = true;
        headerBuffer = line.replace("#EXTHTTP:", "").trim();

        // If already valid JSON in one line
        if (headerBuffer.endsWith("}")) {
          try {
            currentHeaders = JSON.parse(headerBuffer);
          } catch {
            currentHeaders = fixAndParseHeaders(headerBuffer);
          }
          collectingHeaders = false;
        }
      }

      // 🔹 CONTINUE COLLECTING BROKEN HEADER JSON
      else if (collectingHeaders) {
        headerBuffer += line;

        if (line.includes("}")) {
          try {
            currentHeaders = JSON.parse(headerBuffer);
          } catch {
            currentHeaders = fixAndParseHeaders(headerBuffer);
          }
          collectingHeaders = false;
        }
      }

      // 🔹 SKIP
      else if (line === "" || line.startsWith("#EXTM3U")) {
        continue;
      }

      // 🔹 STREAM URL
      else if (line.startsWith("http") && currentChannel) {

        if (skipFirst) {
          skipFirst = false;
          reset();
          continue;
        }

        result[counter] = {
          channel_name: currentChannel,
          group_title: "CS OTT | Jio Cinema",
          tvg_logo: currentLogo,
          url: line,
          user_agent: currentUserAgent,
          headers: currentHeaders,
          cookie: currentHeaders?.Cookie || null,
          referer: currentHeaders?.Referer || null,
          origin: currentHeaders?.Origin || null
        };

        counter++;
        reset();
      }
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), "utf-8");
    console.log("✅ stream.json created with FULL extraction");

  } catch (err) {
    console.error("❌ Failed:", err.message);
    process.exit(1);
  }

  function reset() {
    currentLogo = null;
    currentChannel = null;
    currentUserAgent = null;
    currentHeaders = {};
    headerBuffer = "";
    collectingHeaders = false;
  }
}

// 🔧 Fix broken JSON like missing quotes/brackets
function fixAndParseHeaders(raw) {
  try {
    let fixed = raw;

    // Try closing JSON if broken
    if (!fixed.endsWith("}")) fixed += "}";

    return JSON.parse(fixed);
  } catch {
    return { raw_headers: raw }; // fallback
  }
}

// 🔧 Clean text
function cleanText(text) {
  return text
    .replace(/[^\x20-\x7E]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

fetchAndSaveJson();
