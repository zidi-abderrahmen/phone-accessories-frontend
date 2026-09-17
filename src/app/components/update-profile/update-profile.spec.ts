import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { activatedRouteProvider } from '../../testing/activated-route-mock';


import { UpdateProfile } from './update-profile';

describe('UpdateProfile', () => {
  let component: UpdateProfile;
  let fixture: ComponentFixture<UpdateProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateProfile],
      providers: [
        provideHttpClientTesting(),
        activatedRouteProvider,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UpdateProfile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
