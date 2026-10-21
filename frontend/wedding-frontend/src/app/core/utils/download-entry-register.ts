import type { TDocumentDefinitions } from 'pdfmake/interfaces';

// Loaded only after the admin requests an export; no PDF engine in initial bundles.
export async function downloadEntryRegister(
  definition: TDocumentDefinitions,
  filename: string,
): Promise<void> {
  const [{ default: pdfMake }, { default: fonts }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  pdfMake.addVirtualFileSystem(fonts);
  await pdfMake.createPdf(definition).download(filename);
}
