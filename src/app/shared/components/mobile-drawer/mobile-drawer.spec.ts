import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobileDrawer } from './mobile-drawer';

describe('MobileDrawer', () => {
  let component: MobileDrawer;
  let fixture: ComponentFixture<MobileDrawer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileDrawer],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileDrawer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
