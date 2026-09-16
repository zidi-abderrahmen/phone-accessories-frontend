import { TestBed } from '@angular/core/testing';

import { WishlistFacadeService } from './wishlist-facade.service';

describe('WishlistFacadeService', () => {
  let service: WishlistFacadeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WishlistFacadeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
