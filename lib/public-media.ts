import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const allowed = [
  "googlevideo.com",
  "fbcdn.net",
  "cdninstagram.com",
  "instagram.com",
  "facebook.com",
  "tiktokcdn.com",
  "tiktokcdn-eu.com",
  "byteoversea.com",
  "ibytedtos.com",
  "tiktok.com",
  "storage.googleapis.com",
  "loader.to",
];

// btch-downloader currently serves its YouTube MP4/MP3 streams from this
// exact host. Keep it exact (rather than allowing every *.vidsnap.app host).
const exactAllowed = new Set(["api.vidsnap.app"]);

export async function validatePublicMediaUrl(raw: string) {
  const u = new URL(raw);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port ||
    isIP(u.hostname) ||
    (!exactAllowed.has(u.hostname) && !allowed.some((h) => u.hostname === h || u.hostname.endsWith("." + h)))
  )
    throw Error("Unsupported public media host.");

  const addresses = await lookup(u.hostname, { all: true });
  if (
    !addresses.length ||
    addresses.some(({ address }) => {
      if (isIP(address) === 6) return !/^[23][0-9a-f]{3}:/i.test(address);
      const [a, b] = address.split(".").map(Number);
      return (
        a === 0 ||
        a === 10 ||
        a === 127 ||
        a >= 224 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 198 && (b === 18 || b === 19))
      );
    })
  )
    throw Error("Private or reserved media addresses are blocked.");

  return u;
}
