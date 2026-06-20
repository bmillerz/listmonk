<template>
  <section class="dashboard content">
    <!-- Header. -->
    <div class="db-topbar">
      <div>
        <h1 class="title is-4">Dashboard</h1>
        <p class="db-date">{{ $utils.niceDate(new Date()) }}</p>
      </div>
    </div>

    <!-- Headline counts as KPI cards. -->
    <div class="db-kpis relative">
      <b-loading v-if="isCountsLoading" active :is-full-page="false" />
      <div v-for="k in kpiCards" :key="k.key" class="db-kpi" :style="{ '--accent': k.color }" :data-cy="k.key">
        <span class="db-kpi-label">{{ k.label }}</span>
        <div class="db-kpi-valuerow">
          <span class="db-kpi-value">{{ k.value }}</span>
          <span v-if="k.delta" class="db-kpi-delta" :class="k.delta.good ? 'is-up' : 'is-down'">
            {{ k.delta.arrow === 'up' ? '↑' : '↓' }} {{ k.delta.text }}
            <span class="db-kpi-delta-note">{{ k.deltaNote }}</span>
          </span>
        </div>
        <span v-if="k.sub" class="db-kpi-sub">{{ k.sub }}</span>
      </div>
    </div>

    <!-- Monthly Performance Snapshot (views/clicks toggle) + audience snapshot. -->
    <div class="columns">
      <div class="column is-8">
        <div class="db-card db-card-full relative">
          <b-loading v-if="isChartsLoading" active :is-full-page="false" />
          <b-select v-model="chartMetric" size="is-small" class="db-toggle-select">
            <option value="views">{{ $t('dashboard.campaignViews') }}</option>
            <option value="clicks">{{ $t('dashboard.linkClicks') }}</option>
          </b-select>
          <div class="db-card-head">
            <h3 class="title is-6">Monthly Performance Snapshot</h3>
          </div>
          <p class="db-card-desc">
            {{ chartMetric === 'views' ? 'Daily campaign opens across your account, over the past month.'
              : 'Daily link clicks across your account, over the past month.' }}
          </p>
          <apexchart v-if="chartSeries" type="line" height="260" :options="chartOptions" :series="chartSeries" />
          <p v-else-if="!isChartsLoading" class="db-empty">{{ $t('globals.messages.emptyState') }}</p>
        </div>
      </div>
      <div class="column is-4">
        <div class="db-card db-card-full db-audience relative">
          <b-loading v-if="isCountsLoading" active :is-full-page="false" />
          <div class="db-card-head db-card-head--toggle">
            <h3 class="title is-6">Audience</h3>
            <router-link :to="{ name: 'subscribers' }" class="db-action">View all →</router-link>
          </div>
          <p class="db-card-desc">Your total subscribers and how the audience is growing.</p>
          <div class="db-audience-main">
            <div class="db-audience-valuerow">
              <span class="db-audience-value">{{ $utils.niceNumber(audience.total) }}</span>
              <span v-if="audience.pct !== null" class="db-audience-pct"
                :class="audience.pct >= 0 ? 'is-up' : 'is-down'">
                {{ audience.pct >= 0 ? '↑' : '↓' }} {{ Math.abs(audience.pct) }}%
              </span>
            </div>
            <span class="db-audience-label">{{ $tc('globals.terms.subscriber', 2) }}</span>
          </div>
          <div class="db-audience-breakdown">
            <div class="db-audience-stat">
              <span class="db-audience-stat-val">{{ $utils.niceNumber(audience.blocklisted) }}</span>
              <span class="db-audience-stat-lbl">{{ $t('subscribers.status.blocklisted') }}</span>
            </div>
            <div class="db-audience-stat">
              <span class="db-audience-stat-val">{{ $utils.niceNumber(audience.orphans) }}</span>
              <span class="db-audience-stat-lbl">{{ $t('dashboard.orphanSubs') }}</span>
            </div>
          </div>
          <div v-if="audience.netNew !== null" class="db-audience-growth">
            <span class="db-audience-growth-value">↑ {{ $utils.niceNumber(audience.netNew) }}</span>
            <span class="db-audience-growth-label">Net new subscribers · 30 days</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Historical bounce rate + audience health by source. -->
    <div class="columns">
      <div class="column is-6">
        <div class="db-card db-card-full relative">
          <b-loading v-if="isChartsLoading" active :is-full-page="false" />
          <div class="db-card-head">
            <h3 class="title is-6">Historical Bounce Rate</h3>
          </div>
          <p class="db-card-desc">Monthly bounce rate — bounces as a share of messages sent.</p>
          <apexchart v-if="bounceSeries" type="bar" height="240" :options="bounceOptions" :series="bounceSeries" />
          <p v-else-if="!isChartsLoading" class="db-empty">{{ $t('globals.messages.emptyState') }}</p>
        </div>
      </div>
      <div class="column is-6">
        <div class="db-card db-card-full relative">
          <b-loading v-if="isCountsLoading" active :is-full-page="false" />
          <div class="db-card-head">
            <h3 class="title is-6">Audience Health by Source</h3>
          </div>
          <p class="db-card-desc">New subscribers and churn (unsubscribed) by acquisition source.</p>
          <table v-if="audienceSources.length" class="table is-fullwidth db-table">
            <thead>
              <tr>
                <th>Source</th>
                <th class="has-text-right">Subscribers</th>
                <th class="has-text-right">New (30d)</th>
                <th class="has-text-right">Unsub</th>
                <th class="has-text-right">Churn</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in audienceSources" :key="s.source">
                <td class="db-camp-name">{{ s.label }}</td>
                <td class="has-text-right">{{ $utils.niceNumber(s.subscribers) }}</td>
                <td class="has-text-right">{{ $utils.niceNumber(s.new30) }}</td>
                <td class="has-text-right">{{ $utils.niceNumber(s.unsubscribed) }}</td>
                <td class="has-text-right">
                  <span class="db-churn" :class="churnClass(s.churn)">{{ s.churn }}%</span>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else-if="!isCountsLoading" class="db-empty">{{ $t('globals.messages.emptyState') }}</p>
        </div>
      </div>
    </div>

    <!-- Recent campaigns quick-look. -->
    <div class="db-card relative">
      <b-loading v-if="isCampaignsLoading" active :is-full-page="false" />
      <div class="db-card-head db-card-head--toggle">
        <h3 class="title is-6">Recent Campaigns</h3>
        <div class="db-head-actions">
          <b-switch v-model="hideDrafts" size="is-small">Hide drafts</b-switch>
          <router-link :to="{ name: 'campaigns' }" class="db-action">View all →</router-link>
        </div>
      </div>
      <p class="db-card-desc">Your latest campaigns and their current status.</p>
      <table v-if="visibleCampaigns.length" class="table is-fullwidth db-table">
        <thead>
          <tr>
            <th>Campaign</th>
            <th>Status</th>
            <th>When</th>
            <th class="has-text-right">{{ $t('analytics.recipients') }}</th>
            <th class="has-text-right">Delivered</th>
            <th class="has-text-right">Opens</th>
            <th class="has-text-right">Clicks</th>
            <th class="has-text-right">Bounces</th>
            <th class="has-text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in visibleCampaigns" :key="c.id">
            <td>
              <div class="db-camp-name">{{ c.name }}</div>
              <div v-if="c.lists && c.lists.length" class="db-camp-lists">
                {{ c.lists.map((l) => l.name).join(', ') }}
              </div>
            </td>
            <td>
              <span class="tag is-rounded" :class="statusClass(c.status)">{{ $t(`campaigns.status.${c.status}`) }}</span>
            </td>
            <td class="has-text-grey">{{ campaignWhen(c) }}</td>
            <td class="has-text-right">{{ c.sent ? $utils.niceNumber(c.sent) : '—' }}</td>
            <td class="has-text-right">{{ c.sent ? $utils.niceNumber(c.sent - (c.bounces || 0)) : '—' }}</td>
            <td class="has-text-right">{{ c.views ? $utils.niceNumber(c.views) : '—' }}</td>
            <td class="has-text-right">{{ c.clicks ? $utils.niceNumber(c.clicks) : '—' }}</td>
            <td class="has-text-right">{{ c.bounces ? $utils.niceNumber(c.bounces) : '—' }}</td>
            <td class="has-text-right">
              <router-link v-if="c.status === 'finished'" :to="{ name: 'campaignAnalytics', query: { id: c.id } }"
                class="db-action" title="Analytics">
                <svg class="db-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 20V13" /><path d="M12 20V5" /><path d="M19 20v-9" />
                </svg>
              </router-link>
              <router-link v-else :to="{ name: 'campaign', params: { id: c.id } }" class="db-action" title="Edit">
                <svg class="db-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 20h4L18.5 9.5a2.12 2.12 0 0 0-3-3L5 17v3z" /><path d="M13.5 6.5l3 3" />
                </svg>
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else-if="!isCampaignsLoading" class="db-empty">{{ $t('globals.messages.emptyState') }}</p>
    </div>

    <p v-if="settings['app.cache_slow_queries']" class="db-note">
      *{{ $t('globals.messages.slowQueriesCached') }}
      <a href="https://listmonk.app/docs/maintenance/performance/" target="_blank" rel="noopener noreferer">
        <b-icon icon="link-variant" size="is-small" /> {{ $t('globals.buttons.learnMore') }}
      </a>
    </p>
  </section>
</template>

<script>
import dayjs from 'dayjs';
import Vue from 'vue';
import { mapState } from 'vuex';
import VueApexCharts from 'vue-apexcharts';

// Tonal palette shared with the campaign analytics page, so the two read as one
// product. Each KPI card takes one accent.
const C = {
  subscribers: '#0055d4',
  lists: '#4d8be8',
  campaigns: '#7aa9ee',
  messages: '#3fae6b',
};
const AXIS = '#8a97a8';
const GRID = '#eef1f5';

export default Vue.extend({
  components: {
    apexchart: VueApexCharts,
  },

  data() {
    return {
      isChartsLoading: true,
      isCountsLoading: true,
      isCampaignsLoading: true,
      campaignViews: null,
      campaignClicks: null,
      chartMetric: 'views',
      recentCampaigns: [],
      hideDrafts: false,
      insights: null,
      counts: {
        lists: {},
        subscribers: {},
        campaigns: {},
        messages: 0,
      },
    };
  },

  computed: {
    ...mapState(['settings']),

    // Always show 3, optionally hiding drafts. The fetch is over-sized so that
    // three remain even after drafts are filtered out.
    visibleCampaigns() {
      const rows = this.hideDrafts
        ? this.recentCampaigns.filter((c) => c.status !== 'draft')
        : this.recentCampaigns;
      return rows.slice(0, 3);
    },

    // Email performance over the last 30 days — rates and their 30-day change.
    kpiCards() {
      const em = (this.insights && this.insights.emailMetrics) || {};
      const cur = em.current || null;
      const prior = em.prior || null;
      const n = (v) => this.$utils.niceNumber(v || 0);
      const round1 = (v) => Math.round(v * 10) / 10;
      // Rate (%) for a window: delivery = (sends - bounces) / sends, else metric / sends.
      const rateOf = (m, kind) => {
        if (!m) {
          return null;
        }
        if (kind === 'ctor') {
          return m.opens ? (m.clicks / m.opens) * 100 : null;
        }
        if (!m.sends) {
          return null;
        }
        const num = kind === 'delivery' ? m.sends - m.bounces : m[kind];
        return (num / m.sends) * 100;
      };
      const fmtRate = (kind) => {
        const r = rateOf(cur, kind);
        return r === null ? '—' : `${round1(r)}%`;
      };
      // Percentage-point change vs. the prior 30-day window (null until one exists).
      // higherIsBetter flips the good/bad colour — for unsub rate, up is bad.
      const rateDelta = (kind, higherIsBetter) => {
        const cr = rateOf(cur, kind);
        if (cr === null) {
          return null;
        }
        const pr = rateOf(prior, kind);
        if (pr === null) {
          // No prior window — treat prior as zero and show the absolute count increase.
          let cnt = cur[kind] || 0;
          if (kind === 'delivery') {
            cnt = cur.sends - cur.bounces;
          } else if (kind === 'ctor') {
            cnt = cur.clicks;
          }
          return { text: n(cnt), arrow: 'up', good: true };
        }
        const d = round1(cr - pr);
        const up = d >= 0;
        return { text: `${Math.abs(d)}pp`, arrow: up ? 'up' : 'down', good: higherIsBetter ? up : !up };
      };
      const sendsDelta = () => {
        if (!cur) {
          return null;
        }
        if (!prior || !prior.sends) {
          return { text: n(cur.sends), arrow: 'up', good: true };
        }
        const d = round1(((cur.sends - prior.sends) / prior.sends) * 100);
        const up = d >= 0;
        return { text: `${Math.abs(d)}%`, arrow: up ? 'up' : 'down', good: up };
      };
      return [
        {
          key: 'sends',
          label: 'Sends',
          color: C.subscribers,
          value: cur ? n(cur.sends) : '—',
          delta: sendsDelta(),
          deltaNote: '30d',
          sub: 'last 30 days',
        },
        {
          key: 'delivery',
          label: 'Delivery rate',
          color: C.messages,
          value: fmtRate('delivery'),
          delta: rateDelta('delivery', true),
          deltaNote: '30d',
          sub: cur ? `${n(cur.sends - cur.bounces)} delivered` : '',
        },
        {
          key: 'opens',
          label: 'Open rate',
          color: C.lists,
          value: fmtRate('opens'),
          delta: rateDelta('opens', true),
          deltaNote: '30d',
          sub: cur ? `${n(cur.opens)} opens` : '',
        },
        {
          key: 'clicks',
          label: 'Click rate',
          color: C.campaigns,
          value: fmtRate('clicks'),
          delta: rateDelta('clicks', true),
          deltaNote: '30d',
          sub: cur ? `${n(cur.clicks)} clicks` : '',
        },
        {
          key: 'ctor',
          label: 'Click-to-open rate',
          color: '#7a6ff0',
          value: fmtRate('ctor'),
          delta: rateDelta('ctor', true),
          deltaNote: '30d',
          sub: cur ? `${n(cur.clicks)} of ${n(cur.opens)} opens` : '',
        },
        {
          key: 'unsubs',
          label: 'Unsub rate',
          color: '#e8a13c',
          value: fmtRate('unsubs'),
          delta: rateDelta('unsubs', false),
          deltaNote: '30d',
          sub: cur ? `${n(cur.unsubs)} unsubscribed` : '',
        },
      ];
    },

    // Audience snapshot: subscriber total, % change vs. the base 30d ago (only
    // once a baseline exists), and net new subscribers over the last 30 days.
    audience() {
      const s = this.counts.subscribers || {};
      const sg = (this.insights || {}).subscriberGrowth;
      const netNew = sg ? sg.last30 : null;
      const pct = sg && sg.base > 0 ? Math.round((sg.last30 / sg.base) * 1000) / 10 : null;
      return {
        total: s.total || 0, netNew, pct, blocklisted: s.blocklisted || 0, orphans: s.orphans || 0,
      };
    },

    // Acquisition + churn per source attribute, with a prettified label and a
    // churn rate (unsubscribed / total ever acquired from that source).
    audienceSources() {
      const rows = (this.insights || {}).audienceSources || [];
      return rows.map((r) => {
        const ever = r.subscribers + r.unsubscribed;
        return {
          ...r,
          label: r.source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          churn: ever ? Math.round((r.unsubscribed / ever) * 1000) / 10 : 0,
        };
      });
    },

    // Single series for the selected metric (views/clicks), daily over the past month.
    chartSeries() {
      const isViews = this.chartMetric === 'views';
      const data = isViews ? this.campaignViews : this.campaignClicks;
      if (!data) {
        return null;
      }
      return [{ name: isViews ? this.$t('dashboard.campaignViews') : this.$t('dashboard.linkClicks'), data }];
    },

    chartOptions() {
      return {
        chart: {
          type: 'line',
          fontFamily: 'inherit',
          toolbar: { show: false },
          zoom: { enabled: false },
          animations: { easing: 'easeinout', speed: 400 },
        },
        colors: [this.chartMetric === 'views' ? C.subscribers : C.lists],
        stroke: { curve: 'straight', width: 2 },
        markers: { size: 4, strokeWidth: 0, hover: { size: 6 } },
        dataLabels: { enabled: false },
        grid: { borderColor: GRID, strokeDashArray: 4, padding: { left: 12, right: 12 } },
        xaxis: {
          type: 'datetime',
          labels: { datetimeUTC: false, format: 'dd MMM', style: { colors: AXIS } },
          axisBorder: { show: false },
          axisTicks: { show: false },
        },
        yaxis: {
          min: 0,
          forceNiceScale: true,
          labels: { formatter: (v) => this.$utils.niceNumber(Math.round(v)), style: { colors: AXIS } },
        },
        legend: { show: false },
        tooltip: { x: { format: 'dd MMM' }, theme: 'light' },
      };
    },

    // Monthly bounce rate: bounces / sent per send-month, as a percentage.
    bounceSeries() {
      const br = (this.insights && this.insights.bounceRates) || [];
      if (!br.length) {
        return null;
      }
      return [{
        name: 'Bounce rate',
        data: br.map((m) => [dayjs(m.month).valueOf(), m.sent ? Math.round((m.bounces / m.sent) * 1000) / 10 : 0]),
      }];
    },

    bounceOptions() {
      const rates = ((this.insights && this.insights.bounceRates) || [])
        .map((m) => (m.sent ? (m.bounces / m.sent) * 100 : 0));
      const dataMax = rates.length ? Math.max(...rates) : 0;
      // Keep both threshold lines (2% caution, 5% risk) in view; grow if a month spikes past them.
      const yMax = Math.max(6, Math.ceil(dataMax * 1.2));
      // Always show a full trailing 12-month window, even when only a few months have data.
      const xMin = dayjs().subtract(5, 'month').startOf('month').valueOf();
      const xMax = dayjs().endOf('month').valueOf();
      return {
        chart: {
          type: 'bar',
          fontFamily: 'inherit',
          toolbar: { show: false },
          zoom: { enabled: false },
          animations: { easing: 'easeinout', speed: 400 },
        },
        colors: ['#e0524d'],
        plotOptions: { bar: { columnWidth: '10%', borderRadius: 2 } },
        stroke: { width: 0 },
        dataLabels: { enabled: false },
        grid: { borderColor: GRID, strokeDashArray: 4, padding: { left: 12, right: 12 } },
        // Acceptable-threshold guides, matching the analytics deliverability gauge.
        annotations: {
          yaxis: [
            {
              y: 2,
              borderColor: '#e8a13c',
              strokeDashArray: 5,
              label: {
                text: 'Caution 2%',
                position: 'left',
                textAnchor: 'start',
                offsetY: 8,
                borderColor: 'transparent',
                style: {
                  color: '#fff', background: '#e8a13c', fontSize: '10px', fontWeight: 600,
                },
              },
            },
            {
              y: 5,
              borderColor: '#e0524d',
              strokeDashArray: 5,
              label: {
                text: 'At risk 5%',
                position: 'left',
                textAnchor: 'start',
                offsetY: 8,
                borderColor: 'transparent',
                style: {
                  color: '#fff', background: '#e0524d', fontSize: '10px', fontWeight: 600,
                },
              },
            },
          ],
        },
        xaxis: {
          type: 'datetime',
          min: xMin,
          max: xMax,
          tickAmount: 5,
          labels: { datetimeUTC: false, format: 'MMM yyyy', style: { colors: AXIS } },
          axisBorder: { show: false },
          axisTicks: { show: false },
        },
        yaxis: {
          min: 0,
          max: yMax,
          labels: { formatter: (v) => `${Math.round(v * 10) / 10}%`, style: { colors: AXIS } },
        },
        legend: { show: false },
        tooltip: { x: { format: 'MMM yyyy' }, y: { formatter: (v) => `${v}%` }, theme: 'light' },
      };
    },
  },

  methods: {
    fetchData() {
      this.isCountsLoading = true;
      this.isChartsLoading = true;

      this.$api.getDashboardCounts().then((data) => {
        this.counts = data;
        this.isCountsLoading = false;
      });

      this.$api.getDashboardCharts().then((data) => {
        this.isChartsLoading = false;
        this.campaignViews = this.makeSeries(data.campaignViews);
        this.campaignClicks = this.makeSeries(data.linkClicks);
      });

      this.$api.getCampaigns({
        page: 1, per_page: 15, order_by: 'created_at', order: 'DESC',
      }).then((data) => {
        this.recentCampaigns = data.results || [];
        this.isCampaignsLoading = false;
      });

      // Live extras (growth + bounce rate). Resilient: an older backend without
      // this endpoint just leaves the deltas/chart hidden rather than erroring.
      this.$api.getDashboardInsights().then((data) => {
        this.insights = data;
      }).catch(() => {
        this.insights = null;
      });
    },

    // ApexCharts daily datetime series over the past month: [[epochMs, count], ...].
    // Null when empty so the template shows the empty-state line instead of a blank chart.
    makeSeries(data) {
      if (!data || data.length === 0) {
        return null;
      }
      const cutoff = dayjs().subtract(1, 'month').startOf('day').valueOf();
      const pts = data
        .map((d) => [dayjs(d.date).valueOf(), d.count])
        .filter(([ms]) => ms >= cutoff)
        .sort((a, b) => a[0] - b[0]);
      return pts.length ? pts : null;
    },

    statusClass(status) {
      return {
        finished: 'is-success',
        running: 'is-info',
        scheduled: 'is-warning',
        paused: 'is-light',
        cancelled: 'is-danger',
        draft: 'is-light',
      }[status] || 'is-light';
    },

    // Colour the churn rate: healthy < 5%, caution 5-10%, high > 10%.
    churnClass(churn) {
      if (churn >= 10) {
        return 'is-bad';
      }
      if (churn >= 5) {
        return 'is-warn';
      }
      return 'is-ok';
    },

    // Most relevant timestamp per status: scheduled -> send time, otherwise start/create.
    campaignWhen(c) {
      const d = c.status === 'scheduled' ? c.sendAt : (c.startedAt || c.createdAt);
      return d ? this.$utils.niceDate(d) : '—';
    },

    // A metric as a percentage of recipients (sent), one decimal; blank if not sent.
  },

  created() {
    this.$root.$on('page.refresh', this.fetchData);
  },

  destroyed() {
    this.$root.$off('page.refresh', this.fetchData);
  },

  mounted() {
    this.fetchData();
  },
});
</script>

<style lang="scss" scoped>
// Mirror the campaign-analytics card system so the two pages read as one product.
$white: #fff;
$text-strong: #1f2937;
$muted: #6b7686;
$card-radius: 14px;
$card-bd: 1px solid #ebeef3;
$card-sh: 0 1px 2px rgba(16, 24, 40, 0.04), 0 10px 28px rgba(16, 24, 40, 0.05);
$card-sh-hover: 0 2px 4px rgba(16, 24, 40, 0.05), 0 16px 34px rgba(16, 24, 40, 0.09);

.db-topbar {
  margin-bottom: 1.75rem;

  .title {
    margin-bottom: 0.15rem;
  }
}

.db-date {
  color: $muted;
  font-size: 0.95rem;
}

// KPI grid.
.db-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 1.25rem;
  margin-bottom: 1.75rem;
}

// Uniform vertical rhythm: the chart row sits 1.75rem from its neighbours, like
// the full-width cards (Bulma's default column margins would differ). Only the
// vertical margins/padding are touched; the horizontal gutter stays intact.
.columns {
  margin-top: 0;
  margin-bottom: 1.75rem;

  &:last-child {
    margin-bottom: 0;
  }

  .column {
    padding-top: 0;
    padding-bottom: 0;
  }
}

.db-kpi {
  --accent: #{$muted};
  background: $white;
  border: $card-bd;
  border-radius: $card-radius;
  padding: 1.15rem 1.25rem 1.1rem;
  box-shadow: $card-sh;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-height: 120px;
  transition: box-shadow 0.18s ease, transform 0.18s ease;

  &:hover {
    box-shadow: $card-sh-hover;
    transform: translateY(-2px);
  }

  .db-kpi-label {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.66rem;
    font-weight: 700;
    color: $muted;

    &::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--accent);
      flex: none;
    }
  }

  .db-kpi-valuerow {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .db-kpi-value {
    font-size: 2rem;
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: $text-strong;
  }

  .db-kpi-delta {
    display: inline-flex;
    align-items: baseline;
    gap: 0.25rem;
    font-size: 0.8rem;
    font-weight: 700;

    &.is-up {
      color: #3fae6b;
    }

    &.is-down {
      color: #e0524d;
    }

    .db-kpi-delta-note {
      color: $muted;
      font-weight: 500;
      font-size: 0.72rem;
    }
  }

  .db-kpi-sub {
    margin-top: auto;
    padding-top: 0.35rem;
    font-size: 0.78rem;
    color: $muted;
  }
}

// Chart cards.
.db-card {
  background: $white;
  border: $card-bd;
  border-radius: $card-radius;
  padding: 1.4rem 1.5rem;
  box-shadow: $card-sh;
  margin-bottom: 1.75rem;

  &.db-card-full {
    height: 100%;
    margin-bottom: 0;
  }

  .db-card-head {
    margin-bottom: 0.3rem;

    .title {
      margin-bottom: 0;
      font-size: 1rem;
      font-weight: 700;
      color: $text-strong;
    }
  }

  // Metric toggle pulled out of the header flow (top-right) so the title and
  // explainer keep the exact same spacing as every other card.
  .db-toggle-select {
    position: absolute;
    top: 1.2rem;
    right: 1.5rem;
    z-index: 2;
  }

  .db-card-desc {
    margin: 0 0 1rem;
    font-size: 0.78rem;
    line-height: 1.4;
    color: $muted;
  }
}

// Audience snapshot card: big subscriber total + net-new growth at the foot.
.db-audience {
  display: flex;
  flex-direction: column;

  .db-audience-main {
    margin-top: 0.5rem;
  }

  .db-audience-valuerow {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .db-audience-value {
    font-size: 2.4rem;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.02em;
    color: $text-strong;
  }

  .db-audience-pct {
    font-size: 0.9rem;
    font-weight: 700;

    &.is-up {
      color: #3fae6b;
    }

    &.is-down {
      color: #e0524d;
    }
  }

  .db-audience-label {
    display: block;
    margin-top: 0.15rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.66rem;
    font-weight: 700;
    color: $muted;
  }

  .db-audience-breakdown {
    display: flex;
    gap: 1.75rem;
    margin-top: 1.1rem;

    .db-audience-stat {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .db-audience-stat-val {
      font-size: 1.15rem;
      font-weight: 700;
      color: $text-strong;
    }

    .db-audience-stat-lbl {
      font-size: 0.66rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 600;
      color: $muted;
    }
  }

  .db-audience-growth {
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid #f0f2f6;
  }

  .db-audience-growth-value {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.01em;
    color: #3fae6b;
  }

  .db-audience-growth-label {
    font-size: 0.72rem;
    color: $muted;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 600;
  }
}

.db-table {
  margin-top: 0.25rem;

  th {
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: $muted;
    font-weight: 700;
  }

  td {
    vertical-align: middle;
    border-color: #f0f2f6;
  }

  .db-camp-name {
    font-size: 0.9rem;
    font-weight: 500;
    color: $text-strong;
    max-width: 24rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .db-camp-lists {
    margin-top: 0.1rem;
    font-size: 0.74rem;
    color: $muted;
    max-width: 24rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tag.is-rounded {
    font-weight: 600;
  }
}

.db-card-head--toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.db-action {
  color: $muted;
  white-space: nowrap;

  &:hover {
    color: $text-strong;
  }
}

.db-head-actions {
  display: flex;
  align-items: center;
  gap: 0.9rem;

  // Keep the toggle and its "Hide drafts" label on one line, vertically centred.
  ::v-deep .switch {
    display: inline-flex;
    align-items: center;
    margin-right: 0;
    white-space: nowrap;
  }

  // Divider + spacing separating the toggle from the "View all" link.
  .db-action {
    padding-left: 0.9rem;
    border-left: 1px solid #e7e9ee;
  }
}

.db-action-icon {
  width: 17px;
  height: 17px;
  vertical-align: middle;
}

.db-churn {
  font-weight: 600;

  &.is-ok {
    color: #3fae6b;
  }

  &.is-warn {
    color: #e8a13c;
  }

  &.is-bad {
    color: #e0524d;
  }
}

// Card-header "View all" links sit smaller next to the title (the table's
// row-action .db-action links are unaffected — they live in .db-table).
.db-card-head .db-action {
  font-size: 0.8rem;
  font-weight: 600;
}

.db-empty {
  color: $muted;
  text-align: center;
  padding: 4rem 1rem;
}

.db-note {
  margin-top: 1.5rem;
  color: $muted;
  font-size: 0.85rem;

  a {
    color: $muted;
    text-decoration: underline;
  }
}
</style>
