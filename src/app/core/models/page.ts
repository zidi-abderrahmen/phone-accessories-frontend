export interface Page<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    pageNumber: number;
    first: boolean;
    last: boolean;
    empty: boolean;
}