export interface ReelItem {
    media: {
        code: string;
    };
}

export interface PagingInfo {
    max_id?: string;
    more_available?: boolean;
}

export interface ReelsResponse {
    items?: ReelItem[];
    paging_info?: PagingInfo;
}

export interface PostResponse {
    data?: {
        xdt_shortcode_media?: {
            video_url?: string;
            display_url?: string;
            is_video?: boolean;
            video_view_count?: number;
            edge_media_to_parent_comment?: {
                count: number;
            };
        };
    };
}

export interface PostNode {
    __typename: string;  // "GraphVideo" | "GraphImage" | "GraphSidecar"
    id: string;
    shortcode: string;
    display_url: string;
    is_video: boolean;
    video_url?: string;
    video_view_count?: number;
    edge_media_to_comment?: { count: number };
}

export interface PostsListResponse {
    posts: { node: PostNode }[];
    cursor?: string;
}

export interface CommentUser {
    is_verified: boolean;
    id: string;
    pk: string;
    username: string;
    profile_pic_url: string;
}

export interface Comment {
    id: string;
    text: string;
    created_at: string;
    user: CommentUser;
}

export interface CommentsResponse {
    success: boolean;
    num_comments_grabbed: number;
    credit_cost: number;
    comments: Comment[];
}

export interface BioLink {
    title: string;
    url: string;
    link_type: string;
}

export interface ProfileUser {
    biography: string;
    bio_links: BioLink[];
    full_name: string;
    username: string;
    id: string;
    profile_pic_url: string;
    profile_pic_url_hd: string;
    external_url: string | null;
    is_verified: boolean;
    is_private: boolean;
    is_business_account: boolean;
    is_professional_account: boolean;
    category_name: string | null;
    edge_followed_by: { count: number };
    edge_follow: { count: number };
    edge_owner_to_timeline_media: {
        count: number;
        page_info: {
            has_next_page: boolean;
            end_cursor: string | null;
        };
        edges: Array<{
            node: {
                id: string;
                shortcode: string;
                display_url: string;
                is_video: boolean;
                edge_liked_by: { count: number };
                edge_media_to_comment: { count: number };
            };
        }>;
    };
}

export interface ProfileResponse {
    success: boolean;
    data: {
        user: ProfileUser;
    };
    status: string;
}

export interface HighlightsListResponse {
    highlights: {
        id: string;
    }[];
}

export interface HighlightDetailResponse {
    items: {
        video_versions?: {
            url: string;
        }[];
        image_versions2?: {
            candidates: {
                url: string;
            }[];
        };
    }[];
}
