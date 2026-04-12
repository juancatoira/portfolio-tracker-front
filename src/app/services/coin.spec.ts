import { TestBed } from '@angular/core/testing';

import { Coin } from './coin';

describe('Coin', () => {
  let service: Coin;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Coin);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
