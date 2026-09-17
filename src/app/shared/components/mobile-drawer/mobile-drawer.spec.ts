import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobileDrawer } from './mobile-drawer';
import { activatedRouteProvider } from '../../../testing/activated-route-mock';

describe('MobileDrawer', () => {
  let component: MobileDrawer;
  let fixture: ComponentFixture<MobileDrawer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileDrawer],
      providers: [activatedRouteProvider],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileDrawer);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('open', false);
    fixture.componentRef.setInput('links', []);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});