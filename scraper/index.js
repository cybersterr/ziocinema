const axios = require("axios");
const fs = require("fs");

const JSON_URL = "https://netx.streamstar18.workers.dev/hot1";
const OUTPUT_FILE = "stream.m3u";

// SIMPLE UA = BEST IPTV COMPATIBILITY
const DEFAULT_UA = "okhttp/4.9.3";

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

      // IPTV APPS BREAK WITH COMPLEX UAs
      const ua = DEFAULT_UA;

      // =====================================================
      // PIPE HEADERS
      // =====================================================
      let pipeHeaders = [];

      if (cookie) {
        pipeHeaders.push(`Cookie=${cookie}`);
      }

      pipeHeaders.push(`User-Agent=${ua}`);

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
      // DASH / MPD
      // =====================================================
      if (type === "dash") {

        out += `#KODIPROP:inputstream=inputstream.adaptive\n`;
        out += `#KODIPROP:inputstream.adaptive.manifest_type=mpd\n`;

        // =================================================
        // CLEARKEY
        // =================================================
        if (item.license_url) {

          const match = item.license_url.match(
            /keyid=([^&]+).*key=([^&]+)/i
          );

          if (match) {

            const kid = decodeURIComponent(match[1]);
            const key = decodeURIComponent(match[2]);

            out += `#KODIPROP:inputstream.adaptive.license_type=clearkey\n`;
            out += `#KODIPROP:inputstream.adaptive.license_key=${kid}:${key}\n`;
          }
        }

        // =================================================
        // DASH HEADERS
        // =================================================
        let dashHeaders = [];

        if (cookie) {
          dashHeaders.push(`Cookie=${cookie}`);
        }

        dashHeaders.push(`User-Agent=${ua}`);

        if (referer) {
          dashHeaders.push(`Referer=${referer}`);
        }

        if (origin) {
          dashHeaders.push(`Origin=${origin}`);
        }

        out += `#KODIPROP:inputstream.adaptive.stream_headers=${dashHeaders.join("&")}\n`;
      }

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
