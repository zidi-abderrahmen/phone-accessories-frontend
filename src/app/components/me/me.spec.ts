import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { activatedRouteProvider } from '../../testing/activated-route-mock';


import { Me } from './me';

describe('Me', () => {
  let component: Me;
  let fixture: ComponentFixture<Me>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Me],
      providers: [
        provideHttpClientTesting(),
        activatedRouteProvider,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Me);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
