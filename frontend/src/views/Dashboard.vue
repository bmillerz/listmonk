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
        <span class="db-kpi-label">
          <b-icon :icon="k.icon" size="is-small" /> {{ k.label }}
        </span>
        <div class="db-kpi-valuerow">
          <span class="db-kpi-value">{{ k.value }}</span>
          <span v-if="k.delta" class="db-kpi-delta" :class="`is-${k.delta.dir}`">
            {{ k.delta.dir === 'up' ? '↑' : '↓' }} {{ k.delta.text }}
            <span class="db-kpi-delta-note">{{ k.deltaNote }}</span>
          </span>
        </div>
        <span v-if="k.sub" class="db-kpi-sub">{{ k.sub }}</span>
      </div>
    </div>

    <!-- Trend charts. -->
    <div class="columns">
      <div class="column is-6">
        <div class="db-card db-card-full relative">
          <b-loading v-if="isChartsLoading" active :is-full-page="false" />
          <div class="db-card-head">
            <h3 class="title is-6">{{ $t('dashboard.campaignViews') }}</h3>
          </div>
          <apexchart v-if="viewsSeries" type="line" height="260" :options="chartOptions" :series="viewsSeries" />
          <p v-else-if="!isChartsLoading" class="db-empty">{{ $t('globals.messages.emptyState') }}</p>
        </div>
      </div>
      <div class="column is-6">
        <div class="db-card db-card-full relative">
          <b-loading v-if="isChartsLoading" active :is-full-page="false" />
          <div class="db-card-head">
            <h3 class="title is-6">{{ $t('dashboard.linkClicks') }}</h3>
          </div>
          <apexchart v-if="clicksSeries" type="line" height="260" :options="chartOptions" :series="clicksSeries" />
          <p v-else-if="!isChartsLoading" class="db-empty">{{ $t('globals.messages.emptyState') }}</p>
        </div>
      </div>
    </div>

    <!-- Monthly bounce rate (deliverability over time). -->
    <div class="db-card relative">
      <b-loading v-if="isChartsLoading" active :is-full-page="false" />
      <div class="db-card-head">
        <h3 class="title is-6">Bounce rate (monthly)</h3>
      </div>
      <apexchart v-if="bounceSeries" type="line" height="240" :options="bounceOptions" :series="bounceSeries" />
      <p v-else-if="!isChartsLoading" class="db-empty">{{ $t('globals.messages.emptyState') }}</p>
    </div>

    <!-- Recent campaigns quick-look. -->
    <div class="db-card relative">
      <b-loading v-if="isCampaignsLoading" active :is-full-page="false" />
      <div class="db-card-head">
        <h3 class="title is-6">Recent campaigns</h3>
      </div>
      <table v-if="recentCampaigns.length" class="table is-fullwidth db-table">
        <thead>
          <tr>
            <th>Campaign</th>
            <th>Status</th>
            <th>When</th>
            <th class="has-text-right">{{ $t('analytics.recipients') }}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in recentCampaigns" :key="c.id">
            <td class="db-camp-name">{{ c.name }}</td>
            <td>
              <span class="tag is-rounded" :class="statusClass(c.status)">{{ $t(`campaigns.status.${c.status}`) }}</span>
            </td>
            <td class="has-text-grey">{{ campaignWhen(c) }}</td>
            <td class="has-text-right">{{ c.sent ? $utils.niceNumber(c.sent) : '—' }}</td>
            <td class="has-text-right">
              <router-link v-if="c.status === 'finished'" :to="{ name: 'campaignAnalytics', query: { id: c.id } }"
                class="db-analytics-link">
                <b-icon icon="chart-timeline-variant" size="is-small" /> {{ $t('analytics.title') }}
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
      recentCampaigns: [],
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

    // Headline metrics, each with a one-line breakdown as its sub-label.
    kpiCards() {
      const c = this.counts;
      const n = (v) => this.$utils.niceNumber(v || 0);
      const ins = this.insights || {};
      const sg = ins.subscriberGrowth;
      const mg = ins.messageGrowth;
      // Growth badge: a % once there's a prior-period baseline, otherwise the
      // absolute 30-day figure (a young account has no 30-day-ago baseline yet).
      // Subscribers compare net-new vs. the base; messages compare period-over-period.
      const fmtDelta = (last30, baseline, periodOverPeriod) => {
        if (baseline > 0) {
          const change = periodOverPeriod ? last30 - baseline : last30;
          const pct = Math.round((change / baseline) * 1000) / 10;
          return { text: `${Math.abs(pct)}%`, dir: pct >= 0 ? 'up' : 'down' };
        }
        return { text: this.$utils.niceNumber(last30), dir: 'up' };
      };
      const subDelta = sg ? fmtDelta(sg.last30, sg.base, false) : null;
      const msgDelta = mg ? fmtDelta(mg.last30, mg.prev30, true) : null;
      const byStatus = c.campaigns.byStatus || {};
      const statusSub = Object.entries(byStatus)
        .filter(([, num]) => num > 0)
        .map(([s, num]) => `${num} ${this.$t(`campaigns.status.${s}`)}`)
        .join('  ·  ');
      return [
        {
          key: 'subscribers',
          label: this.$tc('globals.terms.subscriber', 2),
          icon: 'account-multiple',
          color: C.subscribers,
          value: n(c.subscribers.total),
          delta: subDelta,
          deltaNote: '30d',
          sub: `${n(c.subscribers.blocklisted)} ${this.$t('subscribers.status.blocklisted')}`
            + `  ·  ${n(c.subscribers.orphans)} ${this.$t('dashboard.orphanSubs')}`,
        },
        {
          key: 'lists',
          label: this.$tc('globals.terms.list', 2),
          icon: 'format-list-bulleted-square',
          color: C.lists,
          value: n(c.lists.total),
          sub: `${n(c.lists.public)} ${this.$t('lists.types.public')}`
            + `  ·  ${n(c.lists.private)} ${this.$t('lists.types.private')}`,
        },
        {
          key: 'campaigns',
          label: this.$tc('globals.terms.campaign', 2),
          icon: 'rocket-launch-outline',
          color: C.campaigns,
          value: n(c.campaigns.total),
          sub: statusSub,
        },
        {
          key: 'messages',
          label: this.$t('dashboard.messagesSent'),
          icon: 'email-outline',
          color: C.messages,
          value: n(c.messages),
          delta: msgDelta,
          deltaNote: '30d',
          sub: '',
        },
      ];
    },

    viewsSeries() {
      return this.campaignViews ? [{ name: this.$t('dashboard.campaignViews'), data: this.campaignViews }] : null;
    },

    clicksSeries() {
      return this.campaignClicks ? [{ name: this.$t('dashboard.linkClicks'), data: this.campaignClicks }] : null;
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
        colors: [C.subscribers],
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
      return {
        chart: {
          type: 'line',
          fontFamily: 'inherit',
          toolbar: { show: false },
          zoom: { enabled: false },
          animations: { easing: 'easeinout', speed: 400 },
        },
        colors: ['#e0524d'],
        stroke: { curve: 'straight', width: 2 },
        markers: { size: 4, strokeWidth: 0, hover: { size: 6 } },
        dataLabels: { enabled: false },
        grid: { borderColor: GRID, strokeDashArray: 4, padding: { left: 12, right: 12 } },
        xaxis: {
          type: 'datetime',
          labels: { datetimeUTC: false, format: 'MMM yyyy', style: { colors: AXIS } },
          axisBorder: { show: false },
          axisTicks: { show: false },
        },
        yaxis: {
          min: 0,
          forceNiceScale: true,
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
        page: 1, per_page: 5, order_by: 'created_at', order: 'DESC',
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

    // ApexCharts datetime series: [[epochMs, count], ...]. Null when empty so the
    // template shows the empty-state line instead of a blank chart.
    makeSeries(data) {
      if (!data || data.length === 0) {
        return null;
      }
      return data.map((d) => [dayjs(d.date).valueOf(), d.count]);
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

    // Most relevant timestamp per status: scheduled -> send time, otherwise start/create.
    campaignWhen(c) {
      const d = c.status === 'scheduled' ? c.sendAt : (c.startedAt || c.createdAt);
      return d ? this.$utils.niceDate(d) : '—';
    },
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
  margin-bottom: 1.5rem;

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
    gap: 0.35rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.66rem;
    font-weight: 700;
    color: $muted;

    ::v-deep .icon {
      color: var(--accent);
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

  &.db-card-full {
    height: 100%;
  }

  .db-card-head {
    margin-bottom: 0.75rem;

    .title {
      margin-bottom: 0;
      font-size: 1rem;
      font-weight: 700;
      color: $text-strong;
    }
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
    font-weight: 600;
    color: $text-strong;
    max-width: 24rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tag.is-rounded {
    font-weight: 600;
  }
}

.db-analytics-link {
  white-space: nowrap;
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
