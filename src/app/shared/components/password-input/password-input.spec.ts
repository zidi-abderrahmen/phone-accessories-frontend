import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';

import { PasswordInput } from './password-input';
import { activatedRouteProvider } from '../../../testing/activated-route-mock';

describe('PasswordInput', () => {
  let component: PasswordInput;
  let fixture: ComponentFixture<PasswordInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswordInput],
      providers: [activatedRouteProvider],
    }).compileComponents();

    fixture = TestBed.createComponent(PasswordInput);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('control', new FormControl(''));
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});