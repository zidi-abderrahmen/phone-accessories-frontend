import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Accessories } from './accessories';

describe('Accessories', () => {
  let component: Accessories;
  let fixture: ComponentFixture<Accessories>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Accessories],
    }).compileComponents();

    fixture = TestBed.createComponent(Accessories);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
