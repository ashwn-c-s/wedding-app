import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { Guests } from './guests';
import { AdminService } from '../../../core/services/admin.service';
import { ImportReport } from '../../../core/models/admin';
describe('Guest import feedback',()=>{
  const api={guests:vi.fn(),importGuests:vi.fn()};
  beforeEach(()=>{api.guests.mockReset().mockReturnValue(of({guests:[]}));api.importGuests.mockReset();TestBed.configureTestingModule({providers:[{provide:AdminService,useValue:api}]});});
  it('shows per-row partial results and reloads saved guests exactly once',async()=>{
    const report:ImportReport={created:1,updated:0,failed:1,results:[{row:2,status:'created'},{row:3,status:'error',message:'Unknown event'}]};api.importGuests.mockReturnValue(of(report));const component=TestBed.runInInjectionContext(()=>new Guests());await Promise.resolve();component.csv='name,phone,party_size,events\nA,+919876543210,2,wedding';await component.importCsv();expect(api.importGuests).toHaveBeenCalledWith(component.csv);expect(component.report()).toEqual(report);expect(api.guests).toHaveBeenCalledTimes(2);expect(component.importing()).toBe(false);
  });
  it('does not send an empty CSV to the backend',async()=>{const component=TestBed.runInInjectionContext(()=>new Guests());await component.importCsv();expect(api.importGuests).not.toHaveBeenCalled();expect(component.error()).toContain('CSV');});
});
