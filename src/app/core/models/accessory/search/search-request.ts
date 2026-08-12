export interface SearchRequest {
    categoryId: number | null;
    keyword: string | null;
    minPrice: number | null;
    maxPrice: number | null;
    inStock: boolean | null;
}