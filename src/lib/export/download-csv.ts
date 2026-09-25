/**
 * Triggers a browser download of a CSV string.
 *
 * Everything happens in memory — the file is built here, handed to the browser,
 * and the object URL revoked. No network request, so exported data never leaves
 * the user's machine.
 */
export function downloadCsv(fileName: string, csvContent: string): void {
  // The BOM makes Excel read the file as UTF-8 rather than guessing.
  const blob = new Blob(['\uFEFF', csvContent], { type: 'text/csv;charset=utf-8;' });
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(objectUrl);
}
