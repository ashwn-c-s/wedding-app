import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { GuestLocationEditor } from './guest-location-editor';

describe('Guest location editor', () => {
  afterEach(() => vi.unstubAllGlobals());
  function editor() {
    const fixture = TestBed.createComponent(GuestLocationEditor);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const changed = vi.fn(); component.changed.subscribe(changed);
    return {fixture, component, changed};
  }
  it('captures location only on request, displays accuracy and Maps preview', () => {
    let success!: PositionCallback;
    const getCurrentPosition = vi.fn((callback: PositionCallback) => {success=callback;});
    vi.stubGlobal('navigator',{userAgent:'test',geolocation:{getCurrentPosition}});
    const {fixture,component,changed}=editor();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    component.useCurrentLocation();
    expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function),expect.any(Function),{enableHighAccuracy:true,maximumAge:0,timeout:20000});
    expect(component.busy).toBe(true);
    success({coords:{latitude:10.5,longitude:76.2,accuracy:12.3}} as GeolocationPosition);
    fixture.detectChanges();
    expect(changed).toHaveBeenLastCalledWith({type:'coordinates',latitude:10.5,longitude:76.2,accuracy_m:12.3,address:null});
    expect(fixture.nativeElement.textContent).toContain('Estimated accuracy: 12 metres');
    expect(fixture.nativeElement.querySelector('a').href).toContain('query=10.5,76.2');
    component.latitude=10.6;component.update(true);
    expect(changed.mock.lastCall?.[0].accuracy_m).toBeNull();
  });
  it('handles denied permission and timeouts while keeping manual entry available', () => {
    let failure!: PositionErrorCallback;
    vi.stubGlobal('navigator',{userAgent:'test',geolocation:{getCurrentPosition:vi.fn((_s: PositionCallback,callback: PositionErrorCallback)=>failure=callback)}});
    const {component,changed}=editor();
    component.useCurrentLocation();failure({code:1} as GeolocationPositionError);
    expect(component.geoError).toContain('permission was denied');expect(component.busy).toBe(false);expect(changed).not.toHaveBeenCalled();
    component.useCurrentLocation();failure({code:3} as GeolocationPositionError);expect(component.geoError).toContain('timed out');
    component.maps='https://maps.app.goo.gl/example';component.update();expect(changed.mock.lastCall?.[0].type).toBe('maps');
  });
  it('rejects incomplete coordinates and unsafe links and removes an existing location', () => {
    const {component,changed}=editor();
    component.type='coordinates';component.latitude=91;component.longitude=0;component.update();expect(component.error).toContain('latitude');expect(changed).not.toHaveBeenCalled();
    component.latitude=0;component.update();expect(changed.mock.lastCall?.[0].latitude).toBe(0);
    component.type='maps';component.maps='https://maps.app.goo.gl.evil.test/x';component.update();expect(component.error).toContain('HTTPS Google Maps');
    component.clear();expect(changed).toHaveBeenLastCalledWith(null);expect(component.preview).toBe('');expect(component.error).toBe('');
  });
  it('handles unavailable location services without blocking manual guest entry', () => {
    vi.stubGlobal('navigator',{userAgent:'test'});
    const {component}=editor();component.useCurrentLocation();expect(component.geoError).toContain('unavailable');expect(component.busy).toBe(false);
    vi.stubGlobal('navigator',{userAgent:'test',geolocation:{getCurrentPosition:vi.fn(()=>{throw new Error('blocked');})}});
    component.useCurrentLocation();expect(component.geoError).toContain('unavailable');expect(component.busy).toBe(false);
  });
  it('ignores late location callbacks after clearing, changing guest or destroying the editor', () => {
    const callbacks:PositionCallback[]=[];
    vi.stubGlobal('navigator',{userAgent:'test',geolocation:{getCurrentPosition:vi.fn((callback:PositionCallback)=>callbacks.push(callback))}});
    const {fixture,component,changed}=editor();
    component.useCurrentLocation();component.clear();callbacks[0]({coords:{latitude:10,longitude:76,accuracy:5}} as GeolocationPosition);expect(changed).toHaveBeenCalledTimes(1);expect(component.preview).toBe('');
    component.useCurrentLocation();component.ngOnChanges();callbacks[1]({coords:{latitude:10,longitude:76,accuracy:5}} as GeolocationPosition);expect(changed).toHaveBeenCalledTimes(1);
    component.useCurrentLocation();fixture.destroy();callbacks[2]({coords:{latitude:10,longitude:76,accuracy:5}} as GeolocationPosition);expect(changed).toHaveBeenCalledTimes(1);
  });
});
