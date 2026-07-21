/**
 * Minimal single-page PDF writer that embeds a pre-encoded JPEG. No external
 * libraries — we hand-assemble the object table and xref. `imgW/imgH` are the
 * JPEG's pixel dimensions; `ptW/ptH` the page size in PDF points.
 */
export function buildPDF(
  jpeg: Uint8Array,
  imgW: number,
  imgH: number,
  ptW: number,
  ptH: number,
): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const off = [0, 0, 0, 0, 0, 0];
  let pos = 0;

  const put = (u8: Uint8Array) => {
    chunks.push(u8);
    pos += u8.length;
  };
  const puts = (t: string) => put(enc.encode(t));
  const obj = (n: number) => {
    off[n] = pos;
    puts(`${n} 0 obj\n`);
  };

  puts("%PDF-1.4\n");
  obj(1);
  puts("<</Type/Catalog/Pages 2 0 R>>\nendobj\n");
  obj(2);
  puts("<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n");
  obj(3);
  puts(
    `<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${ptW} ${ptH}]/Resources<</XObject<</Im0 4 0 R>>>>/Contents 5 0 R>>\nendobj\n`,
  );
  obj(4);
  puts(
    `<</Type/XObject/Subtype/Image/Width ${imgW}/Height ${imgH}/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${jpeg.length}>>\nstream\n`,
  );
  put(jpeg);
  puts("\nendstream\nendobj\n");
  const cs = `q ${ptW} 0 0 ${ptH} 0 0 cm /Im0 Do Q`;
  obj(5);
  puts(`<</Length ${cs.length}>>\nstream\n${cs}\nendstream\nendobj\n`);

  const xr = pos;
  puts("xref\n0 6\n0000000000 65535 f \n");
  for (let i = 1; i <= 5; i++) puts(`${String(off[i]).padStart(10, "0")} 00000 n \n`);
  puts(`trailer\n<</Size 6/Root 1 0 R>>\nstartxref\n${xr}\n%%EOF`);

  const outLen = pos;
  const out = new Uint8Array(outLen);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}
