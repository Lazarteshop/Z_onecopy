export interface WebsiteCampaign {
  id: string;
  title: string;
  url: string;
  reward: number;
  timer: number;
  logo: string; // Icon name key
  category: 'Shopping' | 'Balita' | 'Teknolohiya' | 'E-Services' | 'Kultura';
  description: string;
  completed: boolean;
  mockPageContent: {
    heroTitle: string;
    heroSubtitle: string;
    primaryColor: string;
    accentColor: string;
    paragraphs: string[];
    features?: string[];
    offers?: string[];
  };
  aiCommercial?: any;
}

export interface WithdrawalRequest {
  id: string;
  accountName: string;
  gcashNumber: string;
  amount: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
  createdAt: string;
  referenceNo: string;
}

export interface ActivityLog {
  id: string;
  type: 'reward' | 'withdraw' | 'bonus';
  title: string;
  amount: number;
  timestamp: string;
  details: string;
}

export interface UserStats {
  balance: number;
  lifetimeEarnings: number;
  completedTasksCount: number;
  dailyCheckInDate: string | null;
}

export interface ReferralFriend {
  id: string;
  name: string;
  avatar: string;
  currentEarnings: number;
  bonusClaimed: boolean;
  joinedAt: string;
  withdrawals?: WithdrawalRequest[];
}

export interface Subscription {
  status: 'none' | 'pending' | 'active' | 'expired';
  planId: '7days' | '1month' | '2months' | '3months' | '4months' | null;
  requestedPlanName?: string | null;
  requestedAmount?: number | null;
  requestedAt?: string | null;
  approvedAt?: string | null;
  expiresAt?: string | null;
}

export interface ZoneComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: string;
}

export interface ZonePost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'embed';
  mediaUrls?: string[];
  embedUrl?: string;
  embedUrls?: string[];
  likes: string[]; // List of user IDs who liked
  comments: ZoneComment[];
  createdAt: string;
  isFlagged?: boolean;
  isRss?: boolean;
  rssLink?: string;
  category?: string;
  sharedPost?: {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    text: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'embed';
    mediaUrls?: string[];
    embedUrl?: string;
    createdAt: string;
  };
}

export interface MerchantAd {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  title: string;
  url: string;
  description: string;
  logo: string;
  category: 'Shopping' | 'Balita' | 'Teknolohiya' | 'E-Services' | 'Kultura';
  primaryColor: string;
  accentColor: string;
  planId: 'bronze' | 'silver' | 'gold' | 'platinum';
  planName: string;
  price: number;
  durationDays: number;
  gcashSenderNumber: string;
  gcashReferenceNo: string;
  status: 'pending' | 'active' | 'declined' | 'expired';
  createdAt: string;
  approvedAt?: string;
  expiresAt?: string;
  aiCommercial?: any;
}

export interface ReelVideo {
  id: string;
  url: string;
  embedUrl: string;
  platform: 'tiktok' | 'facebook' | 'youtube' | 'direct';
  title?: string;
  likes: number;
  likedBy?: string[];
  watchedBy?: string[];
  views?: number;
  audienceCountry?: 'Philippines' | 'India' | 'Indonesia' | 'US' | 'Canada' | 'UK';
  addedBy?: string;
  addedByUserId?: string;
  status?: 'approved' | 'pending' | 'disapproved';
  disapproveReason?: string;
  createdAt: string;
}

export interface ReelRedemption {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  amount: number;
  status: 'completed';
  createdAt: string;
}

export interface ReelTokenSubscription {
  id: string;
  userId?: string;
  userName: string;
  gcashNumber: string;
  gcashRefNo: string;
  packageName: string;
  price: number;
  tokensGranted: number;
  status: 'pending' | 'approved' | 'declined';
  createdAt: string;
  approvedAt?: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  createdAt: string;
}

export interface GroupChat {
  id: string;
  name: string;
  avatar: string;
  description?: string;
  createdBy: string;
  creatorName: string;
  members: string[]; // User IDs
  memberDetails?: { id: string; name: string; avatar: string }[];
  lastMessage?: string;
  lastMessageSender?: string;
  lastMessageTime?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  createdAt: string;
}

export interface StoryReaction {
  userId: string;
  userName: string;
  userAvatar: string;
  emoji: string;
  createdAt: string;
}

export interface StoryViewerDetail {
  id: string;
  name: string;
  avatar: string;
  viewedAt: string;
}

export interface ZoneStory {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  mediaUrl?: string;
  mediaType: 'image' | 'video' | 'text';
  text?: string;
  backgroundColor?: string;
  textColor?: string;
  caption?: string;
  viewers: string[]; // user IDs
  viewerDetails?: StoryViewerDetail[];
  reactions?: StoryReaction[];
  createdAt: string;
  expiresAt: string;
}

// --- Z-ONESHOP & VIRTUAL ASSISTANT (VA) SYSTEM TYPES ---
export interface HiredVADetail {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  email?: string;
  hiredAt: string;
  status: 'active' | 'flagged';
}

export interface VASubscriptionInfo {
  status: 'none' | 'pending' | 'active' | 'expired';
  subscribedAt?: string;
  expiresAt?: string;
  paymentMethod?: 'balance' | 'gcash';
  gcashSenderNumber?: string;
  gcashRefNo?: string;
}

export interface UserVAStats {
  hiredCount: number;
  virtualMoneyBalance: number; // in PHP (VM)
  totalVMEarned: number;
  hiringRewardClaimed: boolean;
  hiringRewardClaimedAt?: string;
  isVaRegistered?: boolean;
  vaSubscription?: VASubscriptionInfo;
  hiredVAs?: HiredVADetail[];
}

export interface VALeaderboardEntry {
  userId: string;
  name: string;
  avatar: string;
  hiredCount: number;
  progressPercent: number;
  rank: number;
  isCurrentUser: boolean;
  hasClaimedReward: boolean;
}

export interface VALeaderboardWinner {
  userId: string;
  userName: string;
  userAvatar: string;
  hiredCount: number;
  claimedAt: string;
  rewardAmount: number;
}

export interface ShopProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: 'Gadgets' | 'Fashion' | 'Beauty' | 'Home' | 'Lifestyle';
  description: string;
  stock: number;
  rating: number;
  isActive?: boolean;
  salesCount?: number;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ShopCartItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  image: string;
  category?: string;
  stock?: number;
  selected?: boolean;
}

export interface ShopShippingAddress {
  recipientName: string;
  phoneNumber: string;
  region: string;
  province: string;
  city: string;
  barangay: string;
  streetAddress: string;
  postalCode?: string;
  deliveryNotes?: string;
  label?: 'Home' | 'Work' | 'Other';
}

export type ShopOrderStatus =
  | 'order_placed'
  | 'for_packing'
  | 'sorting_hub'
  | 'rider_pickup'
  | 'to_ship'
  | 'shipped_success'
  | 'cancelled_by_seller'
  | 'cancelled_by_buyer';

export interface ShopOrderTimelineItem {
  status: ShopOrderStatus | string;
  title: string;
  description: string;
  timestamp: string;
  location?: string;
}

export interface ShopOrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  image: string;
  category?: string;
}

export interface ShopOrder {
  id: string;
  orderNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  items: ShopOrderItem[];
  itemCount: number;
  subtotal: number;
  shippingFee: number;
  discount: number;
  promoCode?: string;
  totalAmount: number;
  paymentMethod: 'gcash' | 'wallet';
  paymentStatus: 'paid' | 'pending_verification';
  gcashSenderName?: string;
  gcashSenderNumber?: string;
  gcashRefNo?: string;
  receiptUrl?: string;
  shippingAddress: ShopShippingAddress;
  trackingNumber: string;
  courierName: string; // e.g., 'Z-one Express', 'J&T Express', 'Flash Express'
  riderName?: string;
  riderPhone?: string;
  status: ShopOrderStatus;
  statusTimeline: ShopOrderTimelineItem[];
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  vaId?: string;
  vaName?: string;
  vaCommissionAmount?: number;
}

export interface ShopBasketItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  image: string;
}

export interface ShopBasket {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  items: ShopBasketItem[];
  totalAmount: number;
  status: 'unpaid' | 'paid_delivered' | 'expired_bad_order';
  createdAt: string;
  paidAt?: string;
  deliveredAt?: string;
  assignedBannerId?: string;
  vaId?: string;
  vaName?: string;
}

export interface VABanner {
  id: string;
  vaUserId: string;
  vaName: string;
  vaAvatar: string;
  bannerType: 'free' | 'paid'; // free: 3 days, 2.5% | paid: 7 days, 5.0%
  title: string;
  message: string;
  promoCode?: string;
  discountPercent?: number;
  imageUrl?: string;
  targetBasketId: string;
  targetCustomerName: string;
  targetOrderAmount: number;
  commissionRate: number; // 2.5 or 5.0
  potentialCommission: number;
  status: 'active' | 'success_paid' | 'bad_order_expired';
  createdAt: string;
  expiresAt: string; // 3 days from creation for free, 7 days for paid
  completedAt?: string;
  earnedCommission?: number;
}

export interface VASubscriptionRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  paymentType: 'balance' | 'gcash';
  gcashSenderNumber?: string;
  gcashRefNo?: string;
  amount: number;
  status: 'pending' | 'active' | 'declined' | 'expired';
  createdAt: string;
  approvedAt?: string;
  expiresAt?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
  isAdmin: boolean;
  stats: UserStats;
  withdrawalsCount: number;
  withdrawals?: WithdrawalRequest[];
  referralCode: string;
  referredFriendsCount: number;
  lastActivities: ActivityLog[];
  createdAt?: string | null;
  subscription?: Subscription | null;
  vaStats?: UserVAStats;
}

export interface UserSession {
  id: string;
  email: string;
  name: string;
  avatar: string;
  referralCode: string;
  isAdmin: boolean;
  isDemo?: boolean;
  isBanned?: boolean;
  reelsTokens?: number;
  subscription?: Subscription;
  stats: UserStats;
  withdrawals: WithdrawalRequest[];
  activityLogs: ActivityLog[];
  referredFriends: ReferralFriend[];
  vaStats?: UserVAStats;
}


