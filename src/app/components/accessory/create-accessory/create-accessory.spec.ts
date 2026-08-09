import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateAccessory } from './create-accessory';

describe('CreateAccessory', () => {
  let component: CreateAccessory;
  let fixture: ComponentFixture<CreateAccessory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateAccessory],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateAccessory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
