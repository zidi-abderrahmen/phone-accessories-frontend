import { Page } from './page';

/**
 * Normalizes a Spring-Data page payload to the trimmed {@link Page} contract.
 * The wire shape can carry extra fields (e.g. `pageable`, `sort`); this drops them
 * and maps the current-page index from the API's `number` field, so consumers never
 * depend on Spring's serialization details.
 */
export function mapToPage<T>(raw: Page<T>): Page<T> {
  return {
    content: raw.content,
    totalElements: raw.totalElements,
    totalPages: raw.totalPages,
    size: raw.size,
    number: raw.number,
    first: raw.first,
    last: raw.last,
    empty: raw.empty,
  };
}