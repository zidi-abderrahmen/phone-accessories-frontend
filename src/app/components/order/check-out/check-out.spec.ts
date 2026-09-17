import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { activatedRouteProvider } from '../../../testing/activated-route-mock';


import { CheckOut } from './check-out';

describe('CheckOut', () => {
  let component: CheckOut;
  let fixture: ComponentFixture<CheckOut>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckOut],
      providers: [
        provideHttpClientTesting(),
        activatedRouteProvider,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckOut);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
