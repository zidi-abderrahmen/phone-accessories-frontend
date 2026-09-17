import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { activatedRouteProvider } from '../../testing/activated-route-mock';


import { VerifyEmail } from './verify-email';

describe('VerifyEmail', () => {
  let component: VerifyEmail;
  let fixture: ComponentFixture<VerifyEmail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyEmail],
      providers: [
        provideHttpClientTesting(),
        activatedRouteProvider,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyEmail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
