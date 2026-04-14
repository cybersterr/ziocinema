const axios = require("axios");
const fs = require("fs");

const STREAM_URL = "https://hotstar.droozy.workers.dev/";
const OUTPUT_FILE = "stream.json";

async function fetchAndConvert() {
  try {
    const response = await axios.get(STREAM_URL, { responseType: "text" });
    const lines = response.data.split("\n");

    const result = [];

    let name = null;
    let logo = null;
    let userAgent = null;
    let headers = {};

    let collectingHeaders = false;
    let headerBuffer = "";

    let idCounter = 1;
    let skipFirst = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 🔹 EXTINF
      if (line.startsWith("#EXTINF:")) {
        const logoMatch = line.match(/tvg-logo="([^"]+)"/);
        const nameMatch = line.match(/,(.*)$/);

        logo = logoMatch ? logoMatch[1] : null;
        name = nameMatch ? cleanText(nameMatch[1]) : null;
      }

      // 🔹 USER AGENT
      else if (line.startsWith("#EXTVLCOPT")) {
        const uaMatch = line.match(/http-user-agent=(.*)/);
        userAgent = uaMatch ? uaMatch[1].trim() : null;
      }

      // 🔹 HEADERS START
      else if (line.startsWith("#EXTHTTP")) {
        collectingHeaders = true;
        headerBuffer = line.replace("#EXTHTTP:", "").trim();

        if (headerBuffer.endsWith("}")) {
          headers = safeJson(headerBuffer);
          collectingHeaders = false;
        }
      }

      // 🔹 MULTILINE HEADER FIX
      else if (collectingHeaders) {
        headerBuffer += line;

        if (line.includes("}")) {
          headers = safeJson(headerBuffer);
          collectingHeaders = false;
        }
      }

      // 🔹 SKIP
      else if (line === "" || line.startsWith("#EXTM3U")) {
        continue;
      }

      // 🔹 URL FOUND
      else if (line.startsWith("http") && name) {

        if (skipFirst) {
          skipFirst = false;
          reset();
          continue;
        }

        const expiresIn = extractExpiry(headers?.Cookie);

        result.push({
          type: "hls",
          id: String(idCounter),
          name: name,
          group: "CS OTT | Jio Cinema", // ✅ FORCED
          logo: logo,
          user_agent: userAgent,
          m3u8_url: line,
          headers: headers,
          expires_in: expiresIn
        });

        idCounter++;
        reset();
      }
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
    console.log("✅ JSON GENERATED SUCCESSFULLY");

  } catch (err) {
    console.error("❌ ERROR:", err.message);
  }

  function reset() {
    name = null;
    logo = null;
    userAgent = null;
    headers = {};
    headerBuffer = "";
    collectingHeaders = false;
  }
}

// 🔧 Safe JSON parser
function safeJson(str) {
  try {
    if (!str.endsWith("}")) str += "}";
    return JSON.parse(str);
  } catch {
    return { raw: str };
  }
}

// 🔧 Extract expiry from cookie
function extractExpiry(cookie) {
  if (!cookie) return null;

  const match = cookie.match(/exp=(\d+)/);
  if (!match) return null;

  const exp = parseInt(match[1]);
  const now = Math.floor(Date.now() / 1000);

  return exp - now; // seconds remaining
}

// 🔧 Clean text
function cleanText(text) {
  return text
    .replace(/[^\x20-\x7E]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

fetchAndConvert();
