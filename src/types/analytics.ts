export type AnalyticsTimeframe = 'today' | '7d' | '30d' | 'all';

export interface CreatorMetricSummary {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalEngagements: number;
  engagementRate: number; // percentage e.g. 5.8
  followersCount: number;
  followersGained: number;
  
  // Previous period comparison (percentage changes or null if all time)
  viewsGrowth: number | null;
  engagementsGrowth: number | null;
  followersGrowth: number | null;
}

export interface PostAnalyticsItem {
  id: string;
  text: string;
  mediaUrl?: string;
  mediaType?: string;
  createdAt: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  productRef?: any;
}

export interface PostAnalyticsSummary {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  avgEngagementPerPost: number;
  items: PostAnalyticsItem[];
}

export interface ReelAnalyticsItem {
  id: string;
  title?: string;
  thumbnailUrl?: string;
  createdAt: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  productRef?: any;
}

export interface ReelAnalyticsSummary {
  totalReels: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  avgEngagementPerReel: number;
  items: ReelAnalyticsItem[];
}

export interface ChallengeAnalyticsItem {
  id: string;
  title: string;
  category: string;
  bannerUrl?: string;
  createdAt: string;
  status: string;
  participantsCount: number;
  entriesCount: number;
  viewsCount: number;
  likesCount: number;
  prizePool: number;
}

export interface ChallengeAnalyticsSummary {
  totalHosted: number;
  totalParticipants: number;
  totalEntries: number;
  totalViews: number;
  totalLikes: number;
  totalPrizePool: number;
  creatorEntriesCount: number;
  items: ChallengeAnalyticsItem[];
}

export interface ProductAnalyticsItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  platform?: string;
  isAffiliate?: boolean;
  commissionRate?: number;
  clicks: number;
  ordersCount: number;
  estimatedEarnings: number;
}

export interface ProductAnalyticsSummary {
  totalTaggedProducts: number;
  totalClicks: number;
  totalOrders: number;
  conversionRate: number; // percentage
  totalEarnings: number;
  isExternalWebhookConnected: boolean;
  items: ProductAnalyticsItem[];
}

export interface GrowthTrendPoint {
  date: string; // ISO date or YYYY-MM-DD
  label: string; // e.g. "Sep 04"
  views: number;
  engagements: number;
  followersGained: number;
  clicks: number;
}

export interface TopPerformingItem {
  id: string;
  type: 'post' | 'reel' | 'challenge' | 'product';
  title: string;
  thumbnailUrl?: string;
  createdAt: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  clicks?: number;
  score: number;
  engagementRate: number;
}

export interface CreatorAnalyticsResponse {
  success: boolean;
  timeframe: AnalyticsTimeframe;
  creator: {
    id: string;
    name: string;
    avatar?: string;
    bio?: string;
  };
  summary: CreatorMetricSummary;
  posts: PostAnalyticsSummary;
  reels: ReelAnalyticsSummary;
  challenges: ChallengeAnalyticsSummary;
  products: ProductAnalyticsSummary;
  trends: GrowthTrendPoint[];
  topPerforming: TopPerformingItem[];
  generatedAt: string;
  cacheStatus: 'hit' | 'fresh';
}
