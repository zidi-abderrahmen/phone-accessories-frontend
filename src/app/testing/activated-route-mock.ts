import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

export const activatedRouteMock: unknown = {
  snapshot: {
    paramMap: convertToParamMap({}),
    queryParamMap: convertToParamMap({}),
    queryParams: {},
    params: {},
    data: {},
  },
  paramMap: of(convertToParamMap({})),
  queryParamMap: of(convertToParamMap({})),
  queryParams: of({}),
  params: of({}),
  data: of({}),
  fragment: of(null),
  url: of([]),
} as const;

export const activatedRouteProvider = {
  provide: ActivatedRoute,
  useValue: activatedRouteMock as ActivatedRoute,
};