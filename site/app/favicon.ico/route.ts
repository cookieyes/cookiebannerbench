import { renderIcon } from "@/lib/icon";

// Required by `output: "export"` — this route is generated at build time.
export const dynamic = "force-static";

/**
 * /favicon.ico, which browsers and crawlers request whether or not a page
 * declares an icon. An ICO file may hold a PNG as-is: a 6-byte header, one
 * 16-byte directory entry, then the image.
 */
export async function GET() {
  const png = Buffer.from(await renderIcon(48).arrayBuffer());
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image
  header.writeUInt8(48, 6); // width
  header.writeUInt8(48, 7); // height
  header.writeUInt8(0, 8); // no palette
  header.writeUInt8(0, 9); // reserved
  header.writeUInt16LE(1, 10); // colour planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(png.length, 14); // image size
  header.writeUInt32LE(22, 18); // image offset
  return new Response(Buffer.concat([header, png]), {
    headers: { "content-type": "image/x-icon" },
  });
}
