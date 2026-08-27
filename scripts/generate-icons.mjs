import sharp from "sharp";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../public/favicon.svg", import.meta.url));
const targets = [
  ["apple-touch-icon.png", 180],
  ["pwa-192x192.png", 192],
  ["pwa-512x512.png", 512],
  ["maskable-512x512.png", 512],
];

await Promise.all(
  targets.map(([name, size]) =>
    sharp(source).resize(Number(size), Number(size)).png().toFile(fileURLToPath(new URL(`../public/${name}`, import.meta.url))),
  ),
);
