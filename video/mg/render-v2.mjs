import { bundle } from "@remotion/bundler";
import {
  selectComposition,
  renderMedia,
  renderStill,
  openBrowser,
} from "@remotion/renderer";
import fs from "node:fs";
const out = "../../temp/mg-video-v2";
fs.mkdirSync(out, { recursive: true });
const serveUrl = await bundle({ entryPoint: "src/index.tsx" });
const browser = await openBrowser("chrome");
const mode = process.argv[2] || "pilots";
async function media(id, alpha = false) {
  const inputProps = alpha ? {preview:false} : {};
  const composition = await selectComposition({serveUrl,id,inputProps,puppeteerInstance:browser});
  const start = Date.now();
  console.log("START", id);
  let last = -1;
  await renderMedia({
    inputProps,
    serveUrl,
    composition,
    puppeteerInstance: browser,
    codec: alpha ? "prores" : "h264",
    proResProfile: alpha ? "4444" : undefined,
    pixelFormat: alpha ? "yuva444p10le" : "yuv420p",
    imageFormat: alpha ? "png" : "jpeg",
    outputLocation: `${out}/${id === "PreviewV2" ? "cantaloom-mg-v2-preview" : id === "AlphaV2" ? "cantaloom-mg-v2-alpha" : id}.${alpha ? "mov" : "mp4"}`,
    concurrency: 4,
    crf: alpha ? undefined : 18,
    onProgress: ({ progress }) => {
      let n = Math.floor(progress * 10) * 10;
      if (n !== last) {
        console.log(id, n + "%");
        last = n;
      }
    },
  });
  console.log("DONE", id, (Date.now() - start) / 1000, "seconds");
}
async function stills() {
  for (const id of ["PreviewV2", "AlphaV2"]) {
    const composition = await selectComposition({
      serveUrl,
      id,
      puppeteerInstance: browser,
    });
    for (const sec of id === "PreviewV2"
      ? [
          0.8, 2, 3.3, 4, 4.7, 5.4, 6.3, 7, 7.7, 8, 24.5, 25.4, 26.4, 27.3,
          28.5, 29.3, 30, 51, 53, 55, 56.4, 76, 79, 96.5, 97.5, 99, 101,
        ]
      : [6.3, 7, 7.7, 8, 16, 28.5, 29.3, 30, 40, 56.4, 65, 90])
      await renderStill({
        serveUrl,
        composition,
        puppeteerInstance: browser,
        frame: Math.round(sec * 30),
        output: `${out}/${id}-${sec}.png`,
      });
  }
}
try {
  if (mode === "screen-alpha") { await media("PilotScreenV2", true); } else if (mode === "pilots") {
    await media("PilotOpeningV2");
    await media("PilotScreenV2");
    await media("PilotScreenV2",true);
    await stills();
  } else if (mode === "stills") await stills();
  else if (mode === "all") {
    await media("PreviewV2");
    await media("AlphaV2", true);
    for (const s of ["opening", "ingredients", "singing", "showcase", "ending"])
      await media(s + "V2", true);
  } else
    await media(
      mode,
      /Alpha|V2$/.test(mode) &&
        !mode.startsWith("Preview") &&
        !mode.startsWith("Pilot"),
    );
} finally {
  await browser.close({ silent: true });
}
