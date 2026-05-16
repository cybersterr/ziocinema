const axios = require("axios");
const fs = require("fs");

const JSON_URL = "https://netx.streamstar18.workers.dev/hot1";
const OUTPUT_FILE = "stream.m3u";

async function run() {
  try {

    const { data } = await axios.get(JSON_URL);

    let out = "#EXTM3U\n\n";

    const used = new Set();

    for (const item of data) {

      // =====================================================
      // SKIP PROMO ENTRY
      // =====================================================
      if (
        item.id === "sf-top" ||
        (item.name || "").includes("Install NetX Player")
      ) {
        continue;
      }

      // =====================================================
      // TYPE
      // =====================================================
      const type = (item.type || "").toLowerCase();

      // =====================================================
      // STREAM URL
      // =====================================================
      let url = "";

      if (type === "dash") {
        url = item.mpd_url;
      } else if (type === "hls") {
        url = item.m3u8_url;
      }

      if (!url) continue;

      // =====================================================
      // DUPLICATES
      // =====================================================
      const uid = `${item.id}_${item.name}`;

      if (used.has(uid)) continue;

      used.add(uid);

      // =====================================================
      // BASIC INFO
      // =====================================================
      const id = item.id || "";
      const name = item.name || "Unknown";
      const logo = item.logo || "";

      // =====================================================
      // SINGLE GROUP FOR ALL CHANNELS
      // =====================================================
      const group = "🎬OTT | JIO-CINEMA";

      // =====================================================
      // HEADERS
      // =====================================================
      const headers = item.headers || {};

      const cookie =
        headers.Cookie ||
        headers.cookie ||
        "";

      const referer =
        headers.Referer ||
        headers.referer ||
        "https://www.hotstar.com/";

      const origin =
        headers.Origin ||
        headers.origin ||
        "https://www.hotstar.com";

      // =====================================================
      // PIPE HEADERS
      // =====================================================
      let pipeHeaders = [];

      if (cookie) {
        pipeHeaders.push(`Cookie=${cookie}`);
      }

      if (referer) {
        pipeHeaders.push(`Referer=${referer}`);
      }

      if (origin) {
        pipeHeaders.push(`Origin=${origin}`);
      }

      const finalUrl =
        pipeHeaders.length > 0
          ? `${url}|${pipeHeaders.join("&")}`
          : url;

      // =====================================================
      // EXTINF
      // =====================================================
      out += `#EXTINF:-1 tvg-id="${id}" tvg-name="${name}" tvg-logo="${logo}" group-title="${group}",${name}\n`;

      // =====================================================
      // FINAL URL
      // =====================================================
      out += `${finalUrl}\n\n`;
    }

    fs.writeFileSync(OUTPUT_FILE, out);

    console.log(`DONE -> ${OUTPUT_FILE}`);

  } catch (err) {

    console.error("ERROR:", err.message);
  }
}

run();
