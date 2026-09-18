import { mapToPage } from './map-to-page';

describe('mapToPage', () => {
  it('pins the mapped page index to the API "number" field', () => {
    const apiResponse = {
      content: [{ id: 1 }, { id: 2 }],
      totalElements: 42,
      totalPages: 5,
      size: 10,
      number: 2,
      // Legacy/incorrect field name that must not leak through the mapper.
      pageNumber: 99,
      first: false,
      last: false,
      empty: false,
    };

    const result = mapToPage(apiResponse);

    expect(result.number).toBe(2);
    expect((result as Record<string, unknown>).pageNumber).toBeUndefined();
  });
});