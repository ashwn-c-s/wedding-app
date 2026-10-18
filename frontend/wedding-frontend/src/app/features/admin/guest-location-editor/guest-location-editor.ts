import { ChangeDetectorRef, Component, EventEmitter, inject, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GuestLocation } from '../../../core/models/admin';
import { guestLocationUrl } from '../../../core/utils/guest-location';
@Component({
  selector:'app-guest-location-editor', imports:[FormsModule],
  templateUrl:'./guest-location-editor.html', styleUrl:'./guest-location-editor.scss',
})
export class GuestLocationEditor implements OnChanges, OnDestroy {
  @Input() location: GuestLocation | null = null;
  @Input() session = 0;
  @Output() changed = new EventEmitter<GuestLocation | null>();
  @Output() invalid = new EventEmitter<string>();
  @Output() locating = new EventEmitter<boolean>();
  type: 'coordinates' | 'maps' = 'maps';
  latitude: number | null = null;
  longitude: number | null = null;
  accuracy: number | null = null;
  maps = '';
  address = '';
  error = '';
  geoError = '';
  busy = false;
  preview = '';
  private request = 0;
  private changeDetector = inject(ChangeDetectorRef);
  ngOnChanges() {
    this.cancelRequest();
    this.type = this.location?.type || 'maps';
    this.latitude = this.location?.latitude ?? null;
    this.longitude = this.location?.longitude ?? null;
    this.accuracy = this.location?.accuracy_m ?? null;
    this.maps = this.location?.maps_url || '';
    this.address = this.location?.address || '';
    this.preview = guestLocationUrl(this.location);
    this.error = this.geoError = '';
  }
  ngOnDestroy() { this.cancelRequest(); }
  private cancelRequest() {
    this.request++;
    if (this.busy) { this.busy = false; this.locating.emit(false); }
  }
  changeType() {
    this.latitude = this.longitude = this.accuracy = null;
    this.maps = '';
    this.update();
  }
  update(manualCoordinates = false) {
    this.cancelRequest();
    this.geoError = '';
    if (manualCoordinates) this.accuracy = null;
    let value: GuestLocation | null = null;
    this.error = '';
    const empty = this.type === 'maps' ? !this.maps.trim() : this.latitude === null && this.longitude === null;
    if (empty && !this.address.trim()) {
      this.preview = ''; this.invalid.emit(''); this.changed.emit(null); return;
    }
    if (this.address.length > 500) this.error = 'Address must be at most 500 characters.';
    else if (this.type === 'coordinates') {
      if (this.latitude === null || this.longitude === null || !Number.isFinite(this.latitude) || !Number.isFinite(this.longitude) || Math.abs(this.latitude) > 90 || Math.abs(this.longitude) > 180) this.error = 'Enter latitude from -90 to 90 and longitude from -180 to 180.';
      else value = {type:'coordinates',latitude:this.latitude,longitude:this.longitude,accuracy_m:this.accuracy,address:this.address.trim() || null};
    } else {
      const url = guestLocationUrl({type:'maps',maps_url:this.maps.trim()});
      if (!url || this.maps.length > 2048) this.error = 'Enter a supported HTTPS Google Maps location link.';
      else value = {type:'maps',maps_url:url,address:this.address.trim() || null};
    }
    this.preview = this.error ? '' : guestLocationUrl(value);
    this.invalid.emit(this.error);
    if (!this.error) this.changed.emit(value);
  }
  clear() {
    this.type = 'maps'; this.latitude = this.longitude = this.accuracy = null;
    this.maps = this.address = ''; this.update();
  }
  useCurrentLocation() {
    this.cancelRequest();
    this.geoError = '';
    if (!navigator.geolocation) { this.geoError = 'Location is unavailable in this browser. Paste a Maps link or enter coordinates.'; return; }
    const request = this.request;
    this.busy = true; this.locating.emit(true);
    try { navigator.geolocation.getCurrentPosition(position => {
      if (request !== this.request) return;
      this.changeDetector.markForCheck();
      this.busy = false; this.locating.emit(false);
      const {latitude,longitude,accuracy} = position.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(accuracy) || accuracy < 0 || Math.abs(latitude)>90 || Math.abs(longitude)>180) {
        this.geoError = 'The browser returned an invalid location. Try again or enter it manually.'; return;
      }
      this.type = 'coordinates'; this.latitude = latitude; this.longitude = longitude;
      this.accuracy = accuracy; this.maps = ''; this.update();
    }, error => {
      if (request !== this.request) return;
      this.changeDetector.markForCheck();
      this.busy = false; this.locating.emit(false);
      this.geoError = error.code === 1 ? 'Location permission was denied. Allow location in browser settings, or enter it manually.'
        : error.code === 3 ? 'Location request timed out. Try again or enter it manually.'
        : 'Your location could not be determined. Try again or enter it manually.';
    }, {enableHighAccuracy:true,maximumAge:0,timeout:20000});
    } catch {
      this.busy = false; this.locating.emit(false);
      this.geoError = 'Location access is unavailable. Paste a Maps link or enter coordinates.';
    }
  }
}
