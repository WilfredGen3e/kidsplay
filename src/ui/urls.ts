/** Object-URL's voor blobs; `revoke` ruimt ze allemaal op. */
export function createUrlBag() {
  const urls = new Map<Blob, string>();
  return {
    url(blob: Blob): string {
      let u = urls.get(blob);
      if (!u) {
        u = URL.createObjectURL(blob);
        urls.set(blob, u);
      }
      return u;
    },
    revoke() {
      for (const u of urls.values()) URL.revokeObjectURL(u);
      urls.clear();
    },
  };
}
