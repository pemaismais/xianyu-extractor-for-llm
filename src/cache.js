/** @type {Map<string, { reviews: number, approval: number | null }>} */
export const reputationCache = new Map();

/** @type {Map<string, object>} userId → seller profile data */
export const sellerCache = new Map();

/** @type {Map<string, object[]>} userId → accumulated item list */
export const sellerItemsCache = new Map();

/** @type {Map<string, number>} userId → total item count reported by API */
export const sellerTotalCache = new Map();
