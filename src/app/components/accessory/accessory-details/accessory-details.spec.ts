import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccessoriesDetails } from './accessory-details';

describe('AccessoryDetails', () => {
  let component: AccessoriesDetails;
  let fixture: ComponentFixture<AccessoriesDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccessoriesDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(AccessoriesDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
