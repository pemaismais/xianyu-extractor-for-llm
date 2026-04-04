/** @type {Map<string, { reviews: number, approval: number | null }>} */
export const reputationCache = new Map();

/** @type {Map<string, object>} userId → seller profile data */
export const sellerCache = new Map();

/** Most recently intercepted seller userId (set by user.page.head XHR) */
export let lastSellerUserId = null;
export function setLastSellerUserId(id) { lastSellerUserId = id; }

/** @type {Map<string, object[]>} userId → accumulated item list */
export const sellerItemsCache = new Map();

/** @type {Map<string, number>} userId → total item count reported by API */
export const sellerTotalCache = new Map();

/** @type {Map<string, object[]>} userId → accumulated reviews list */
export const sellerReviewsCache = new Map();

/** @type {Map<string, number>} userId → total review count reported by API */
export const sellerReviewsTotalCache = new Map();
