export const models = Object.freeze({
  serverConfig: 'serverConfig',
  lang: 'lang',
  dashboard: 'dashboard',
  // This loading state is used across all contexts where lists are loaded
  // via the instant "minimal" API.
  lists: 'lists',
  // This is used only on the lists page where lists are loaded with full
  // context (subscriber counts), which can be slow and expensive.
  listsFull: 'listsFull',
  subscribers: 'subscribers',
  campaigns: 'campaigns',
  templates: 'templates',
  media: 'media',
  bounces: 'bounces',
  users: 'users',
  profile: 'profile',
  userRoles: 'userRoles',
  listRoles: 'listRoles',
  settings: 'settings',
  logs: 'logs',
  maintenance: 'maintenance',
});

// Ad-hoc URIs that are used outside of vuex requests.
const rootURL = import.meta.env.VUE_APP_ROOT_URL || '/';
const baseURL = import.meta.env.BASE_URL.replace(/\/$/, '');

export const uris = Object.freeze({
  previewCampaign: '/api/campaigns/:id/preview',
  previewCampaignArchive: '/api/campaigns/:id/preview/archive',
  previewTemplate: '/api/templates/:id/preview',
  previewRawTemplate: '/api/templates/preview',
  exportSubscribers: '/api/subscribers/export',
  errorEvents: '/api/events?type=error',
  base: `${baseURL}/static`,
  root: rootURL,
  static: `${baseURL}/static`,
});

// Keys used in Vuex store.
export const storeKeys = Object.freeze({
  models: 'models',
  isLoading: 'isLoading',
});

export const timestamp = 'ddd D MMM YYYY, hh:mm A';

export const colors = Object.freeze({
  primary: '#0055d4',
});

// Deliverability thresholds (% of messages sent), aligned to AWS SES enforcement
// bands: at/above `caution` is a warning, at/above `risk` is account-at-risk.
// Single source of truth for the dashboard history charts AND the campaign
// analytics gauges, so the two views can never drift apart.
export const deliverability = Object.freeze({
  bounce: Object.freeze({ caution: 5, risk: 10 }),
  complaint: Object.freeze({ caution: 0.1, risk: 0.5 }),
  // Below this many sends in the rolling window a rate is too thin to trust, so
  // the dashboard greys the bar instead of colouring it against the bands.
  volumeFloor: 500,
});

export const regDuration = '[0-9]+(ms|s|m|h|d)';
