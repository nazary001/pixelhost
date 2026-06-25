/** A single rich-text node from Strapi's `blocks` field. */
export interface BlockNode {
  type: string;
  level?: number;
  format?: "ordered" | "unordered";
  url?: string;
  image?: {
    url: string;
    alternativeText?: string | null;
    width?: number;
    height?: number;
  };
  text?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  children?: BlockNode[];
}

export interface Category {
  name: string;
  slug: string;
  description?: string | null;
}

export interface Author {
  name: string;
  slug: string;
  role: string | null;
  bio: BlockNode[] | null;
  avatarUrl: string | null;
}

export interface Article {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  description: string;
  content: BlockNode[];
  featuredImage: string | null;
  featuredImageWidth: number | null;
  featuredImageHeight: number | null;
  contentImage1: string | null;
  contentImage2: string | null;
  category: Category | null;
  author: Author | null;
  tags: string[];
  views: number;
  readingMinutes: number;
  publishedAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
}
