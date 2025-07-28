export interface PaginatedResponse<T> {
  current_page: number;
  has_next: boolean;
  has_previous: boolean;
  items: T[];
  next_page: number;
  page_size: number;
  previous_page: number;
  total_items: number;
  total_pages: number;
}
