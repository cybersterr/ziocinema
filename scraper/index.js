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

      // ============================================
      // SKIP FIRST TELEGRAM / NETX ENTRY
      // ============================================
      if (
        item.id === "sf-top" ||
        (item.name || "").includes("Install NetX Player")
      ) {
        continue;
      }

      const type = (item.type || "").toLowerCase();

      // ============================================
      // STREAM URL
      // ============================================
      const url =
        type === "dash"
          ? item.mpd_url
          : item.m3u8_url;

      if (!url) continue;

      // ============================================
      // DUPLICATE CHECK
      // ============================================
      const uid = `${item.id}_${item.name}`;

      if (used.has(uid)) continue;
      used.add(uid);

      // ============================================
      // BASIC INFO
      // ============================================
      const name = item.name || "Unknown";
      const logo = item.logo || "";
      const group = item.group || "Live";

      // ============================================
      // HEADERS
      // ============================================
      const headers = item.headers || {};

      const cookie = headers.Cookie || headers.cookie || "";
      const referer = headers.Referer || headers.referer || "";
      const origin = headers.Origin || headers.origin || "";
      const ua = item.user_agent || "Mozilla/5.0";

      // ============================================
      // URL HEADERS FORMAT
      // ============================================
      let pipeHeaders = [];

      if (cookie)
        pipeHeaders.push(`Cookie=${cookie}`);

      if (ua)
        pipeHeaders.push(`User-Agent=${ua}`);

      if (referer)
        pipeHeaders.push(`Referer=${referer}`);

      if (origin)
        pipeHeaders.push(`Origin=${origin}`);

      const finalUrl =
        pipeHeaders.length > 0
          ? `${url}|${pipeHeaders.join("&")}`
          : url;

      // ============================================
      // EXTINF
      // ============================================
      out += `#EXTINF:-1 tvg-id="${item.id}" tvg-name="${name}" tvg-logo="${logo}" group-title="${group}",${name}\n`;

      // ============================================
      // DASH / MPD
      // ============================================
      if (type === "dash") {

        out += `#KODIPROP:inputstream=inputstream.adaptive\n`;
        out += `#KODIPROP:inputstream.adaptive.manifest_type=mpd\n`;

        // ============================================
        // CLEARKEY
        // ============================================
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

        // ============================================
        // STREAM HEADERS
        // ============================================
        let streamHeaders = [];

        if (ua)
          streamHeaders.push(`User-Agent=${ua}`);

        if (referer)
          streamHeaders.push(`Referer=${referer}`);

        if (origin)
          streamHeaders.push(`Origin=${origin}`);

        if (cookie)
          streamHeaders.push(`Cookie=${cookie}`);

        if (streamHeaders.length > 0) {
          out += `#KODIPROP:inputstream.adaptive.stream_headers=${streamHeaders.join("&")}\n`;
        }
      }

      // ============================================
      // HLS / M3U8
      // ============================================
      else if (type === "hls") {

        if (ua)
          out += `#EXTVLCOPT:http-user-agent=${ua}\n`;

        if (referer)
          out += `#EXTVLCOPT:http-referrer=${referer}\n`;
      }

      // ============================================
      // FINAL URL
      // ============================================
      out += `${finalUrl}\n\n`;
    }

    fs.writeFileSync(OUTPUT_FILE, out);

    console.log(`done -> ${OUTPUT_FILE}`);

  } catch (err) {
    console.error(err.message);
  }
}

run();
