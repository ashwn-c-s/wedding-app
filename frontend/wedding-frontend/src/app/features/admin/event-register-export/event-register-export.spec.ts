import { TestBed } from '@angular/core/testing';
import type { DashboardData } from '../../../core/models/admin';
import { EntryRegisterPdf } from '../../../core/services/entry-register-pdf.service';
import { EventRegisterExport } from './event-register-export';
const download = vi.fn<(...args: any[]) => Promise<void>>();
const data = {
  guests: [
    {
      id: 'a',
      name: 'Anita',
      party_size: 4,
      event_ids: ['wedding'],
      tags: [{ id: 'family', name: 'Family' }],
    },
    { id: 'b', name: 'Binu', party_size: 2, event_ids: ['wedding'], tags: [] },
  ],
  tags: [{ id: 'family', name: 'Family' }],
  events: [{ id: 'wedding', name: 'Wedding', date: '2026-11-15', slug: 'wedding' }],
  responses: [],
} as unknown as DashboardData;
async function setup() {
  TestBed.configureTestingModule({
    imports: [EventRegisterExport],
    providers: [{ provide: EntryRegisterPdf, useValue: { download } }],
  });
  const fixture = TestBed.createComponent(EventRegisterExport);
  fixture.componentRef.setInput('data', data);
  fixture.componentRef.setInput('allowTags', true);
  fixture.componentRef.setInput('search', 'Anita');
  fixture.componentRef.setInput('tagIds', ['family']);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}
describe('Entry register export controls', () => {
  beforeEach(() => download.mockReset());
  it('exports the full selected event by default despite dashboard search/tag filters', async () => {
    const fixture = await setup();
    await fixture.componentInstance.exportPdf();
    const [document, filename] = download.mock.calls[0];
    expect(JSON.stringify(document.content)).toContain('Binu');
    expect(JSON.stringify(document.content)).toContain('Anita');
    expect(filename).not.toContain('filtered');
    expect(fixture.componentInstance.busy()).toBe(false);
  });
  it('explicit filtered scope restricts the register and labels the filename', async () => {
    const fixture = await setup();
    fixture.componentInstance.scope.set('filtered');
    await fixture.componentInstance.exportPdf();
    const [document, filename] = download.mock.calls[0];
    expect(JSON.stringify(document.content)).not.toContain('Binu');
    expect(JSON.stringify(document.content)).toContain('FILTERED REGISTER');
    expect(filename).toContain('filtered');
  });
  it('blocks export during a refresh, and reports/retries download failures', async () => {
    const fixture = await setup();
    fixture.componentRef.setInput('disabled', true);
    await fixture.componentInstance.exportPdf();
    expect(download).not.toHaveBeenCalled();
    fixture.componentRef.setInput('disabled', false);
    download.mockRejectedValueOnce(new Error('failed'));
    await fixture.componentInstance.exportPdf();
    expect(fixture.componentInstance.error()).toContain('Unable to generate');
    await fixture.componentInstance.exportPdf();
    expect(fixture.componentInstance.error()).toBe('');
    expect(fixture.componentInstance.success()).toContain('PDF generated');
  });
});
