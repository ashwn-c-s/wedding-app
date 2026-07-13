import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RsvpConfirmed } from './rsvp-confirmed';

describe('RsvpConfirmed', () => {
  let component: RsvpConfirmed;
  let fixture: ComponentFixture<RsvpConfirmed>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RsvpConfirmed],
    }).compileComponents();

    fixture = TestBed.createComponent(RsvpConfirmed);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
