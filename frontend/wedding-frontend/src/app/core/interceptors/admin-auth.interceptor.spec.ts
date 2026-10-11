import { isAdminApiRequest } from './admin-auth.interceptor';
import { environment } from '../../../environments/environment';
describe('Admin token scoping',()=>{
  it('only permits bearer injection into backend admin paths',()=>{
    expect(isAdminApiRequest(`${environment.apiBaseUrl}/api/admin/guests`)).toBe(true);
    expect(isAdminApiRequest(`${environment.apiBaseUrl}/api/invite/token`)).toBe(false);
    expect(isAdminApiRequest(`${environment.apiBaseUrl}/api/administrator`)).toBe(false);
    expect(isAdminApiRequest('/api/admin/guests')).toBe(false);
    expect(isAdminApiRequest('https://external.example/api/admin/guests')).toBe(false);
  });
});
