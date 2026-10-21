import { Injectable } from '@angular/core';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

@Injectable({ providedIn: 'root' })
export class EntryRegisterPdf {
  async download(definition: TDocumentDefinitions, filename: string): Promise<void> {
    const { downloadEntryRegister } = await import('../utils/download-entry-register');
    await downloadEntryRegister(definition, filename);
  }
}
