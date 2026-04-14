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

    let skipFirst = true;
    let counter = 1; // ✅ numeric counter

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      // Extract info from #EXTINF
      if (trimmed.startsWith("#EXTINF:")) {
        const logoMatch = trimmed.match(/tvg-logo="([^"]+)"/);
        const channelMatch = trimmed.match(/,(.*)$/);

        currentLogo = logoMatch ? logoMatch[1] : null;
        currentChannel = channelMatch ? channelMatch[1] : null;
      }

      // Skip unwanted lines
      else if (
        trimmed.startsWith("#EXTVLCOPT") ||
        trimmed.startsWith("#EXTHTTP") ||
        trimmed === ""
      ) {
        continue;
      }

      // Extract URL
      else if (trimmed.startsWith("http") && currentChannel) {

        // Skip first entry if needed
        if (skipFirst) {
          skipFirst = false;
          currentLogo = null;
          currentChannel = null;
          continue;
        }

        result[counter] = {  // ✅ ONLY CHANGE HERE
          url: trimmed,
          group_title: "CS OTT | Jio Cinema",
          tvg_logo: currentLogo,
          channel_name: currentChannel
        };

        counter++; // increment number

        // Reset
        currentLogo = null;
        currentChannel = null;
      }
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), "utf-8");
    console.log("✅ stream.json saved successfully.");

  } catch (err) {
    console.error("❌ Failed to fetch M3U:", err.message);
    process.exit(1);
  }
}

fetchAndSaveJson();
