import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvalidInvite } from './invalid-invite';

describe('InvalidInvite', () => {
  let component: InvalidInvite;
  let fixture: ComponentFixture<InvalidInvite>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvalidInvite],
    }).compileComponents();

    fixture = TestBed.createComponent(InvalidInvite);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
