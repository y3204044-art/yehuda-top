export type PageStatus = 
  | 'pending' 
  | 'detecting' 
  | 'extracting_right' 
  | 'extracting_left' 
  | 'completed' 
  | 'error';

export interface ColumnLayout {
  startX: number;
  endX: number;
}

export interface PageLayout {
  rightColumn: ColumnLayout;
  leftColumn: ColumnLayout;
}

export interface PageData {
  id: string;
  pageNumber: number;
  thumbnail: string; // Low-res Data URL for sidebar to save memory
  status: PageStatus;
  layout?: PageLayout;
  rightText: string;
  leftText: string;
  error?: string;
}
