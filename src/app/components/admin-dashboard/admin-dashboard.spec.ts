import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminDashboard } from './admin-dashboard';
import { OrderStatus } from '../../core/models/checkout/enums/order-status';

describe('AdminDashboard', () => {
  let component: AdminDashboard;
  let fixture: ComponentFixture<AdminDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDashboard],
      providers: [provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('nextStatus advances through the order lifecycle', () => {
    expect(component.nextStatus(OrderStatus.PENDING)).toBe(OrderStatus.PROCESSING);
    expect(component.nextStatus(OrderStatus.PROCESSING)).toBe(OrderStatus.SHIPPED);
    expect(component.nextStatus(OrderStatus.SHIPPED)).toBe(OrderStatus.DELIVERED);
  });

  it('nextStatus returns null for terminal states', () => {
    expect(component.nextStatus(OrderStatus.DELIVERED)).toBeNull();
    expect(component.nextStatus(OrderStatus.CANCELLED)).toBeNull();
  });
});
