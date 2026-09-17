import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { activatedRouteProvider } from '../../../testing/activated-route-mock';


import { AccessoriesDetails } from './accessory-details';

describe('AccessoryDetails', () => {
  let component: AccessoriesDetails;
  let fixture: ComponentFixture<AccessoriesDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccessoriesDetails],
      providers: [
        provideHttpClientTesting(),
        activatedRouteProvider,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccessoriesDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
