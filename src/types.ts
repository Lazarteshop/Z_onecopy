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
  type: 'reward' | 'withdraw' | 'bonus' | 'deposit';
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
  // GCash InstaPay Payment Submission Info
  paymentId?: string | null;
  paymentReferenceNumber?: string | null;
  gcashAccountName?: string | null;
  gcashMobileNumber?: string | null;
  receiptScreenshot?: string | null;
  rejectionReason?: string | null;
}

export interface SubscriptionPlanDef {
  id: '7days' | '1month' | '2months' | '3months' | '4months';
  name: string;
  price: number;
  validityDays: number;
  badge?: string;
  desc: string;
  popular?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanDef[] = [
  {
    id: '7days',
    name: '7-Days Special Trial',
    price: 20,
    validityDays: 7,
    badge: '⚡ MURA & MABILIS',
    desc: '₱20 lang para sa 7 araw na pang-simula habang nag-iipon!'
  },
  {
    id: '1month',
    name: '1 Month Access',
    price: 200,
    validityDays: 30,
    popular: true,
    badge: '🔥 PINAKA-POPULAR',
    desc: '30 araw na unlimited clicks, videos & GCash cashout access.'
  },
  {
    id: '2months',
    name: '2 Months Access',
    price: 500,
    validityDays: 60,
    badge: '⚡ SAVE ₱100',
    desc: '60 araw na pinalawak na earning portal access.'
  },
  {
    id: '3months',
    name: '3 Months VIP Access',
    price: 1000,
    validityDays: 90,
    badge: '👑 VIP BEST VALUE',
    desc: '90 araw na VIP priority cashouts & double rewards.'
  },
  {
    id: '4months',
    name: '4 Months Diamond Access',
    price: 2000,
    validityDays: 120,
    badge: '💎 MAXIMUM ACCESS',
    desc: '120 araw ng walang katapusang earning portal at pinakamabilis na payout priority.'
  }
];

export interface SubscriptionPayment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  planId: '7days' | '1month' | '2months' | '3months' | '4months' | string;
  planName: string;
  amount: number;
  gcashAccountName: string;
  gcashMobileNumber: string;
  referenceNumber: string;
  paymentDateTime: string;
  receiptScreenshot: string;
  notes?: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
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
  videoSourceAvailable?: boolean;
  videoStreamType?: 'direct' | 'hls' | 'dailymotion' | 'youtube' | 'okru' | 'embed';
  episodeTitle?: string;
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
  thumbnailUrl?: string;
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
  clientMessageId?: string;
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
  clientMessageId?: string;
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

// Z-oneShop Master Product Categories (Single Source of Truth)
export const ZONE_SHOP_CATEGORIES = [
  'Electronics',
  'Wearables',
  'Audio',
  'Home & Living',
  'Health & Wellness',
  'Travel & Outdoor',
  'Fashion Accessories',
  'Food & Pantry',
  'Gadgets',
  'Fashion',
  'Beauty',
  'Home',
  'Lifestyle'
] as const;

export type ZoneShopCategory = typeof ZONE_SHOP_CATEGORIES[number];

// Helper to ensure backward compatibility for existing products with legacy category names
export const normalizeShopCategory = (cat?: string): string => {
  if (!cat || !cat.trim()) return 'Lifestyle';
  const c = cat.trim();
  const exact = ZONE_SHOP_CATEGORIES.find(zc => zc.toLowerCase() === c.toLowerCase());
  if (exact) return exact;
  if (/electronic/i.test(c)) return 'Electronics';
  if (/wearable|watch/i.test(c)) return 'Wearables';
  if (/audio|headphone|earbud|speaker/i.test(c)) return 'Audio';
  if (/home & living/i.test(c)) return 'Home & Living';
  if (/health|wellness|supplement/i.test(c)) return 'Health & Wellness';
  if (/travel|outdoor|camping|sports/i.test(c)) return 'Travel & Outdoor';
  if (/accessory|accessories/i.test(c)) return 'Fashion Accessories';
  if (/food|pantry|grocery|snack/i.test(c)) return 'Food & Pantry';
  if (/gadget/i.test(c)) return 'Gadgets';
  if (/beauty|skincare|cosmetic/i.test(c)) return 'Beauty';
  if (/fashion|apparel|clothing/i.test(c)) return 'Fashion';
  if (/home/i.test(c)) return 'Home';
  return c;
};

export interface ShopProduct {
  id: string;
  name: string;
  title?: string;
  price: number;
  originalPrice?: number;
  image: string;
  primaryImage?: string;
  images?: string[];
  category: ZoneShopCategory | string;
  description: string;
  sourceDescription?: string;
  aiNormalizedDescription?: string;
  stock: number;
  rating: number;
  isActive?: boolean;
  salesCount?: number;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  isAffiliate?: boolean;
  affiliateUrl?: string;
  originalAffiliateUrl?: string;
  resolvedUrl?: string;
  resolvedProductUrl?: string;
  platform?: 'Shopee' | 'TikTok Shop' | 'Lazada' | 'Amazon' | 'Shopify' | 'Etsy' | 'Other' | string;
  platformName?: string;
  affiliatePlatform?: string;
  seller?: string;
  sellerName?: string;
  brand?: string;
  specifications?: { label: string; value: string }[] | Record<string, string>;
  keyFeatures?: string[];
  availability?: string;
  currency?: string;
  priceStatus?: 'available' | 'unavailable' | string;
  importSource?: string;
  importedAt?: string;
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
  addressLabel?: string;
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
  userEmail?: string;
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

export interface UserPhoto {
  id: string;
  url: string;
  caption?: string;
  privacy: 'public' | 'only_me';
  uploadedAt: string;
}

export interface UserAlbum {
  id: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  title: string;
  description?: string;
  privacy: 'public' | 'only_me';
  coverPhoto?: string;
  photos: UserPhoto[];
  createdAt: string;
  updatedAt?: string;
}

export interface UserProfileInfo {
  id: string;
  name: string;
  avatar: string;
  coverPhoto?: string;
  bio?: string;
  isAdmin?: boolean;
  createdAt?: string;
  postCount?: number;
  publicPhotoCount?: number;
  albumCount?: number;
  isOnline?: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
  coverPhoto?: string;
  bio?: string;
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
  coverPhoto?: string;
  bio?: string;
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
  // Wallet Funding & Reservation (Local-First Ledger)
  lockedChallengeFunds?: number;
  lockedMissionFunds?: number;
  availableBalance?: number;
  pendingDeposits?: number;
  // Community Safety, Age Verification & Device Binding
  accountSafetyStatus?: AccountSafetyStatus;
  isMinor?: boolean;
  dateOfBirth?: string;
  boundDeviceId?: string;
  verificationAudit?: VerificationAuditSummary;
  attribution?: {
    sourceEntryId?: string;
    sourceChallengeId?: string;
    inviterParticipantId?: string;
    timestamp?: string;
  };
}

export type AccountSafetyStatus =
  | 'pending_verification'
  | 'verified_adult'
  | 'minor_restricted'
  | 'reverification_required'
  | 'under_review';

export type VerificationAgeBracket = 'minor_under18' | 'adult_18plus' | 'unknown';

export interface VerificationAuditSummary {
  verifiedAt: string;
  providerRef: string;
  bracket: VerificationAgeBracket;
  method: string;
  riskScore?: number;
}

export interface VerificationAuditRecord {
  id: string;
  userId: string;
  userEmail: string;
  status: 'approved' | 'rejected' | 'under_review';
  ageBracket: VerificationAgeBracket;
  provider: 'veriff_protocol' | 'didit_protocol' | 'face_liveness_sdk' | 'system_audit';
  providerReferenceId: string;
  verifiedAt: string;
  riskScore: number;
  estimatedAge?: number;
  notes?: string;
}

export interface RegisteredDeviceDoc {
  id: string; // deviceKeyId UUID
  boundUserId: string;
  boundUserEmail: string;
  createdAt: string;
  lastSeenAt: string;
  deviceLabel: string;
  status: 'active' | 'transferred' | 'blocked';
  ipRiskLogs: Array<{ ip: string; timestamp: string }>;
}

export interface DeviceTransferChallenge {
  id: string;
  userId: string;
  targetDeviceKeyId: string;
  otpCodeHash: string;
  createdAt: string;
  expiresAt: string;
  attempts: number;
  verified: boolean;
}

export interface KiddieContentItem {
  id: string;
  title: string;
  description: string;
  category: 'educational' | 'cartoon' | 'story' | 'kiddie_movie' | 'live_tv';
  videoUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  ageRating: 'all_ages' | 'kids_7plus';
  tags: string[];
  viewsCount?: number;
  featured?: boolean;
  isLive?: boolean;
  streamType?: 'hls' | 'mp4' | 'youtube' | 'direct';
  channelName?: string;
  createdAt: string;
}

// ============================================================
//   CREATOR CHALLENGES & SPONSORED MISSIONS TYPES
// ============================================================

export type ChallengeCategory = 'Singing' | 'Dancing' | 'Comedy' | 'Gaming' | 'Photography' | 'Fitness' | 'Education' | 'Other';
export type ChallengeStatus = 'draft' | 'pending_review' | 'active' | 'completed' | 'cancelled' | 'archived';
export type ChallengeEntryStatus = 'pending' | 'approved' | 'rejected';
export type SponsoredMissionStatus = 'draft' | 'pending_review' | 'active' | 'completed' | 'cancelled';

export interface CreatorChallenge {
  id: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  rules: string;
  startDate: string;
  endDate: string;
  maxParticipants: number;
  status: ChallengeStatus;
  createdAt: string;
  updatedAt: string;
  prizePool?: number;
  sponsorId?: string;
  sponsorName?: string;
  sponsorBudget?: number;
  hostEarnings?: number;
  platformFee?: number;
  isSettled?: boolean;
  settledAt?: string;
  participants: string[];
  participantsCount: number;
  entriesCount: number;
  viewsCount: number;
  likes: string[];
  likesCount: number;
  coverImage?: string;
  endedAt?: string;
  rewardDistributionStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'PARTIAL_FAILURE' | 'FAILED';
  rewardDistributedAt?: string;
  rewardsSummary?: {
    totalDistributed: number;
    winnersCount: number;
    hostReward: number;
    distributions: { userId: string; name: string; role: string; rank?: number; amount: number }[];
  };
  cleanupStatus?: 'active' | 'pending' | 'eligible' | 'archived';
  cleanupEligibleAt?: string;
  archivedAt?: string;
  isArchived?: boolean;
}

export interface ChallengeEntry {
  id: string;
  challengeId: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  reelId?: string;
  mediaUrl?: string;
  mediaType?: 'video' | 'image' | 'text';
  caption: string;
  createdAt: string;
  updatedAt?: string;
  status: ChallengeEntryStatus;
  score: number;
  likes: string[];
  votesCount: number;
  linkOpensCount?: number;
  referralRegistrationsCount?: number;
}

export interface ChallengeVotingRules {
  currentEntryCount: number;
  maxAllowedVotes: number;
}

export interface UserChallengeVotingStats {
  currentEntryCount: number;
  maxAllowedVotes: number;
  votesUsed: number;
  votesRemaining: number;
  canVoteMore: boolean;
  votedEntryIds: string[];
}

export function calculateMaxVotesPerUser(entryCount: number): number {
  if (entryCount <= 0) return 0;
  if (entryCount <= 25) return 1;
  if (entryCount <= 50) return 2;
  if (entryCount <= 100) return 3;
  return 3 + Math.ceil((entryCount - 100) / 50);
}

export interface SponsoredMission {
  id: string;
  sponsorId: string;
  sponsorName: string;
  sponsorAvatar?: string;
  title: string;
  description: string;
  challengeId?: string;
  budget: number;
  prizePool: number;
  hostEarnings: number;
  platformFee: number;
  startDate: string;
  endDate: string;
  status: SponsoredMissionStatus;
  createdAt: string;
  approvedAt?: string;
  settledAt?: string;
}

export type DepositStatus = 'pending' | 'approved' | 'rejected';

export interface DepositRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  amount: number;
  referenceNo?: string;
  proofImageUrl?: string;
  status: DepositStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  targetPurpose?: 'challenge' | 'sponsor' | 'wallet' | 'challenge_budget' | 'mission_budget';
  targetEntityId?: string;
}

export interface WalletSummary {
  totalBalance: number;
  availableBalance: number;
  lockedChallengeFunds: number;
  lockedMissionFunds: number;
  pendingDeposits: number;
  activeChallengesCount?: number;
  activeMissionsCount?: number;
}

export interface BilibiliFeedItem {
  id: string; // Deterministic "bilibili:{videoId}"
  source: 'bilibili';
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  title: string;
  thumbnailUrl: string;
  videoUrl: string;
  embedUrl?: string;
  publishedAt?: string;
  duration?: string;
  views?: string;
  fetchedAt: string;
}

export interface BilibiliFeedConfig {
  enabled: boolean;
  sourceSpaces: string[];
  lastSyncTime?: number;
  lastError?: string | null;
  itemCount?: number;
}



