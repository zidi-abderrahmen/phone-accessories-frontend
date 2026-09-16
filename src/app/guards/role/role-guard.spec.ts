import { TestBed } from '@angular/core/testing';
import { roleGuard } from './role-guard';

describe('roleGuard', () => {
  const executeGuard = (allowedRoles: string[]) => 
    TestBed.runInInjectionContext(() => roleGuard(allowedRoles));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});