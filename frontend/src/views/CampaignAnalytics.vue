<template>
  <section class="analytics content relative">
    <!-- Title bar with a searchable campaign dropdown on the right. -->
    <div class="ca-topbar">
      <h1 class="title is-4">{{ $t('analytics.title') }}</h1>
      <b-field class="ca-topbar-filter">
        <b-autocomplete v-model="campaignSearch" :data="queriedCampaigns" field="name"
          placeholder="Search a campaign…" icon="magnify" :loading="isSearchLoading" open-on-focus rounded clearable
          @typing="queryCampaigns" @focus="queryCampaigns" @select="onCampaignSelect" />
      </b-field>
    </div>

    <div v-if="serverConfig.privacy.disable_tracking || !serverConfig.privacy.individual_tracking"
      class="notification is-warning is-light">
      <template v-if="serverConfig.privacy.disable_tracking">
        {{ $t('analytics.trackingDisabled') }}
      </template>
      <template v-else-if="!serverConfig.privacy.individual_tracking">
        {{ $t('analytics.nonIndividualTracking') }}
      </template>
    </div>

    <!-- Empty state. -->
    <div v-if="form.campaigns.length === 0" class="ca-empty">
      <b-icon icon="chart-timeline-variant" size="is-large" custom-class="ca-empty-icon" />
      <p>{{ $t('analytics.selectCampaign') }}</p>
    </div>

    <div v-else class="ca-body relative">
      <b-loading :active="isLoading" :is-full-page="false" />

      <!-- Campaign context header. -->
      <header class="ca-camp-head">
        <div class="ca-camp-title-row">
          <h2 class="ca-camp-name">{{ campaign.name }}</h2>
          <span v-if="campaign.status" class="tag is-rounded ca-status" :class="statusClass(campaign.status)">
            {{ $t(`campaigns.status.${campaign.status}`) }}
          </span>
        </div>
        <p v-if="campaign.subject" class="ca-subject">{{ campaign.subject }}</p>
        <div class="ca-camp-meta">
          <span v-if="campaign.startedAt" class="ca-meta-item">
            <span class="ca-meta-k">{{ $t('analytics.sent') }}</span>
            <span class="ca-meta-v">{{ niceDateTime(campaign.startedAt) }}</span>
          </span>
          <span v-if="campaign.lists && campaign.lists.length" class="ca-meta-item ca-meta-lists">
            <span class="ca-meta-k">{{ $tc('globals.terms.list', campaign.lists.length) }}</span>
            <span class="ca-meta-v">{{ campaign.lists.map((l) => l.name).join(', ') }}</span>
          </span>
        </div>
      </header>

      <!-- KPI cards. -->
      <div class="ca-kpis">
        <div v-for="k in kpiCards" :key="k.key" class="ca-kpi" :style="{ '--accent': k.color }">
          <div class="ca-kpi-top">
            <span class="ca-kpi-label">{{ k.label }}</span>
            <span class="ca-kpi-value">{{ k.value }}</span>
            <span class="ca-kpi-sub">{{ k.sub }}</span>
          </div>
          <div v-if="k.bar !== null" class="ca-kpi-bar">
            <div class="ca-kpi-bar-fill"
              :style="{ width: `${Math.min((k.bar / (k.barMax || 100)) * 100, 100)}%`, background: k.color }" />
          </div>
        </div>
      </div>

      <!-- Engagement snapshot (2/3) + deliverability health (1/3). -->
      <div class="columns">
        <div class="column is-8">
          <div class="ca-card ca-card-full">
            <div class="ca-card-head">
              <h3 class="title is-6">24-Hour Performance Snapshot</h3>
              <b-select v-model="snapshotMetric" size="is-small">
                <option value="views">{{ $t('campaigns.views') }}</option>
                <option value="clicks">{{ $t('campaigns.clicks') }}</option>
              </b-select>
            </div>
            <p class="ca-card-desc">Unique {{ snapshotMetric === 'clicks' ? $t('campaigns.clicks') : $t('campaigns.views') }} per hour over the 24 hours after this campaign was sent.</p>
            <apexchart v-if="!isLoading" type="line" height="300" :options="engagementOptions"
              :series="engagementSeries" />
            <p class="ca-note">
              <b-icon icon="information-outline" size="is-small" /> {{ $t('analytics.opensIndicative') }}
            </p>
          </div>
        </div>
        <div class="column is-4">
          <div class="ca-card ca-card-full">
            <div class="ca-card-head">
              <h3 class="title is-6">{{ $t('analytics.deliverability') }}</h3>
            </div>
            <p class="ca-card-desc">How your bounce and complaint rates compare to acceptable sending thresholds.</p>
            <div class="ca-health">
              <div v-for="g in healthGauges" :key="g.key" class="ca-gauge">
                <div class="ca-gauge-head">
                  <span class="ca-gauge-label">{{ g.label }}</span>
                  <span class="ca-gauge-value">{{ g.value }}%</span>
                </div>
                <div class="ca-gauge-track">
                  <div class="ca-gauge-fill" :style="{ width: `${g.fill}%`, background: g.fillColor }" />
                  <span class="ca-gauge-marker" :style="{ left: `${g.markPos}%` }" />
                </div>
                <div class="ca-gauge-foot">
                  <span class="ca-gauge-status" :style="{ color: g.statusColor }">
                    <svg class="ca-gauge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <template v-if="g.statusKey === 'healthy'">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M8 12.5l2.6 2.6 5.2-5.7" />
                      </template>
                      <template v-else-if="g.statusKey === 'caution'">
                        <path d="M12 4L20.5 19.5L3.5 19.5Z" />
                        <path d="M12 10v4" />
                        <path d="M12 17h.01" />
                      </template>
                      <template v-else>
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7.5v5.5" />
                        <path d="M12 16.5h.01" />
                      </template>
                    </svg>{{ g.status }}
                  </span>
                  <span class="ca-gauge-thresh">Acceptable &lt; {{ g.acceptable }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Funnel + top links. -->
      <div class="columns">
        <div class="column is-5">
          <div class="ca-card ca-card-full">
            <div class="ca-card-head">
              <h3 class="title is-6">Engagement Funnel</h3>
            </div>
            <p class="ca-card-desc">How recipients progressed from delivered to opened to clicked.</p>
            <div class="ca-ladder">
              <div v-for="s in funnelStages" :key="s.key" class="ca-rung">
                <div class="ca-rung-head">
                  <span class="ca-rung-label">{{ s.label }}</span>
                  <span class="ca-rung-val">
                    {{ $utils.niceNumber(s.count) }}<span class="ca-rung-pct">{{ s.pct }}%</span>
                  </span>
                </div>
                <div class="ca-rung-track">
                  <div class="ca-rung-fill" :style="{ width: `${s.pct}%`, background: s.color }" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="column is-7">
          <div class="ca-card ca-card-full">
            <div class="ca-card-head">
              <h3 class="title is-6">Top Clicked Links</h3>
            </div>
            <p class="ca-card-desc">The links that drew the most clicks in this campaign.</p>
            <table v-if="!isLoading && raw.links.length" class="table is-fullwidth is-hoverable ca-links-table">
              <thead>
                <tr>
                  <th>{{ $t('analytics.links') }}</th>
                  <th class="has-text-right">{{ $t('campaigns.clicks') }}</th>
                  <th class="has-text-right">%</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="l in topLinks" :key="l.url">
                  <td class="ca-link-url">
                    <a :href="l.url" target="_blank" rel="noopener noreferrer">{{ l.short }}</a>
                  </td>
                  <td class="has-text-right">{{ $utils.niceNumber(l.count) }}</td>
                  <td class="has-text-right has-text-grey">{{ l.pct }}%</td>
                </tr>
              </tbody>
            </table>
            <p v-else-if="!isLoading" class="ca-note-empty">{{ $t('analytics.noLinks') }}</p>
          </div>
        </div>
      </div>
</div>
  </section>
</template>

<script>
import dayjs from 'dayjs';
import Vue from 'vue';
import { mapState } from 'vuex';
import VueApexCharts from 'vue-apexcharts';
import { deliverability } from '../constants';

// Gauge top sits 20% above the at-risk line so the worst band has visible headroom.
const gaugeMax = (risk) => Math.round(risk * 1.2 * 100) / 100;

// Tonal palette: engagement metrics are shades of listmonk's primary blue;
// bounces/unsubscribes keep semantic error/warning tones.
const C = {
  opens: '#0055d4',
  clicks: '#4d8be8',
  ctor: '#7aa9ee',
  delivered: '#a7c8f4',
  bounces: '#e0524d',
  unsubs: '#e8a13c',
  neutral: '#8a97a8',
};
const AXIS = '#8a97a8';
const GRID = '#eef1f5';

export default Vue.extend({
  components: {
    apexchart: VueApexCharts,
  },

  data() {
    return {
      isSearchLoading: false,
      isLoading: false,
      queriedCampaigns: [],
      campaignSearch: '',
      snapshotMetric: 'views',

      // Raw per-type time-series ([{ campaignId, count, timestamp }]) and the
      // link breakdown ([{ url, count }]), plus the matching click-through URLs.
      raw: {
        views: [], clicks: [], bounces: [], complaints: [], unsubscribes: [], links: [],
      },
      counts: {
        views: 0, clicks: 0, bounces: 0, complaints: 0, unsubscribes: 0, links: 0,
      },
      urls: [],

      form: {
        campaigns: [],
        from: null,
        to: null,
      },
    };
  },

  computed: {
    ...mapState(['serverConfig']),

    campaign() {
      return this.form.campaigns[0] || {};
    },

    // Denominator for all the rates.
    totalSent() {
      return this.campaign.sent || 0;
    },

    // The headline metric cards. `bar` is the rate %, shown as a progress bar at
    // the foot of the rate cards (null = no bar, e.g. recipients / click-to-open).
    kpiCards() {
      const opens = this.counts.views;
      const { clicks } = this.counts;
      const ctor = opens ? Math.round((clicks / opens) * 1000) / 10 : 0;
      return [
        {
          key: 'recipients',
          label: this.$t('analytics.recipients'),
          value: this.$utils.niceNumber(this.totalSent),
          sub: this.campaign.startedAt ? this.niceDateTime(this.campaign.startedAt) : '',
          color: C.neutral,
          bar: null,
        },
        {
          key: 'open',
          label: this.$t('analytics.openRate'),
          value: `${this.rate(opens)}%`,
          sub: `${this.$utils.niceNumber(opens)} ${this.$t('campaigns.views').toLowerCase()}`,
          color: C.opens,
          bar: this.rate(opens),
        },
        {
          key: 'click',
          label: this.$t('analytics.clickRate'),
          value: `${this.rate(clicks)}%`,
          sub: `${this.$utils.niceNumber(clicks)} ${this.$t('campaigns.clicks').toLowerCase()}`,
          color: C.clicks,
          bar: this.rate(clicks),
        },
        {
          key: 'ctor',
          label: this.$t('analytics.clickToOpenRate'),
          value: `${ctor}%`,
          sub: this.$t('analytics.clicksPerOpen'),
          color: C.ctor,
          bar: ctor,
        },
        {
          key: 'bounce',
          label: this.$t('analytics.bounceRate'),
          value: `${this.rate(this.counts.bounces)}%`,
          sub: `${this.$utils.niceNumber(this.counts.bounces)} ${this.$t('globals.terms.bounces').toLowerCase()}`,
          color: C.bounces,
          bar: this.rate(this.counts.bounces),
          // Scale the bar to the deliverability bounce gauge so a low-but-meaningful
          // bounce rate reads as a visible bar, not a sliver.
          barMax: gaugeMax(deliverability.bounce.risk),
        },
        {
          key: 'unsub',
          label: this.$t('analytics.unsubRate'),
          value: `${this.rate(this.counts.unsubscribes)}%`,
          sub: `${this.$utils.niceNumber(this.counts.unsubscribes)} ${this.$t('campaigns.unsubscribes').toLowerCase()}`,
          color: C.unsubs,
          bar: this.rate(this.counts.unsubscribes),
          // Relative to email industry norms: a healthy unsub rate is well under 0.5%,
          // ~2% is alarmingly high — so the bar fills against a 2% ceiling.
          barMax: 2,
        },
      ];
    },

    engagementSeries() {
      const isClicks = this.snapshotMetric === 'clicks';
      return [{
        name: isClicks ? this.$t('campaigns.clicks') : this.$t('campaigns.views'),
        data: this.pts(this.snapshotMetric),
      }];
    },

    engagementOptions() {
      return {
        chart: {
          type: 'line',
          fontFamily: 'inherit',
          toolbar: { show: false },
          zoom: { enabled: false },
          animations: { easing: 'easeinout', speed: 400 },
        },
        colors: [this.snapshotMetric === 'clicks' ? C.clicks : C.opens],
        stroke: { curve: 'straight', width: 2 },
        markers: { size: 4, strokeWidth: 0, hover: { size: 6 } },
        dataLabels: { enabled: false },
        grid: { borderColor: GRID, strokeDashArray: 4, padding: { left: 12, right: 12 } },
        xaxis: {
          type: 'datetime',
          labels: { datetimeUTC: false, format: 'HH:mm', style: { colors: AXIS } },
          axisBorder: { show: false },
          axisTicks: { show: false },
        },
        yaxis: {
          min: 0,
          forceNiceScale: true,
          labels: { formatter: (v) => this.$utils.niceNumber(Math.round(v)), style: { colors: AXIS } },
        },
        legend: { show: false },
        tooltip: { x: { format: 'dd MMM HH:mm' }, theme: 'light' },
      };
    },

    // Conversion funnel. `pct` (share of sent) drives the bar width so it tapers;
    funnelStages() {
      const sent = this.totalSent;
      const delivered = Math.max(sent - this.counts.bounces, 0);
      const rel = (n, base) => (base ? Math.round((n / base) * 1000) / 10 : 0);
      const raw = [
        {
          key: 'sent', label: this.$t('analytics.sent'), count: sent, color: '#cbd6e6',
        },
        {
          key: 'delivered', label: this.$t('analytics.delivered'), count: delivered, color: '#93b8ef',
        },
        {
          key: 'opened', label: this.$t('analytics.opened'), count: this.counts.views, color: '#3f7fe0',
        },
        {
          key: 'clicked', label: this.$t('analytics.clicked'), count: this.counts.clicks, color: '#0a4fb8',
        },
      ];
      return raw.map((s) => ({
        ...s,
        pct: rel(s.count, sent),
      }));
    },

    // Top clicked links with each link's share of total clicks.
    topLinks() {
      const total = this.raw.links.reduce((s, l) => s + l.count, 0);
      return this.raw.links.map((l) => ({
        url: l.url,
        short: this.shortUrl(l.url),
        count: l.count,
        pct: total ? Math.round((l.count / total) * 1000) / 10 : 0,
      }));
    },

    // Deliverability health gauges: bounce/unsub rate against acceptable
    // thresholds, with green/amber/red zones and a position marker (SES style).
    healthGauges() {
      // Muted, dashboard-matching status tones (not loud traffic-light colours).
      const GREEN = '#5a9e7a';
      const AMBER = '#d99e52';
      const RED = '#d4625a';
      const build = (key, label, value, scaleMax, bands) => {
        // bands: [{ to, color, status, icon }] ascending; last `to` === scaleMax.
        const band = bands.find((b) => value <= b.to) || bands[bands.length - 1];
        return {
          key,
          label,
          value,
          // A single subtle bar filling to the rate, coloured by status; a thin
          // marker shows the "acceptable" threshold line.
          fill: Math.min((value / scaleMax) * 100, 100),
          fillColor: band.color,
          markPos: Math.min((bands[0].to / scaleMax) * 100, 100),
          status: band.status,
          statusColor: band.color,
          statusKey: band.icon,
          acceptable: bands[0].to,
        };
      };
      return [
        build(
          'bounce',
          this.$t('analytics.bounceRate'),
          this.rate(this.counts.bounces),
          gaugeMax(deliverability.bounce.risk),
          [
            {
              to: deliverability.bounce.caution, color: GREEN, status: 'Healthy', icon: 'healthy',
            },
            {
              to: deliverability.bounce.risk, color: AMBER, status: 'Caution', icon: 'caution',
            },
            {
              to: gaugeMax(deliverability.bounce.risk), color: RED, status: 'At risk', icon: 'risk',
            },
          ],
        ),
        build(
          'complaint',
          'Complaint rate',
          this.rate(this.counts.complaints),
          gaugeMax(deliverability.complaint.risk),
          [
            {
              to: deliverability.complaint.caution, color: GREEN, status: 'Healthy', icon: 'healthy',
            },
            {
              to: deliverability.complaint.risk, color: AMBER, status: 'Caution', icon: 'caution',
            },
            {
              to: gaugeMax(deliverability.complaint.risk), color: RED, status: 'At risk', icon: 'risk',
            },
          ],
        ),
      ];
    },
  },

  methods: {
    // Rate of a count as a percentage of total sent, one decimal.
    rate(n) {
      return this.totalSent ? Math.round((n / this.totalSent) * 1000) / 10 : 0;
    },

    // Dense hourly time-series [ms, count] across the whole window, so lines plot
    // ZERO for hours with no activity instead of stopping at the last data point.
    pts(typ) {
      const HOUR = 3600000;
      const m = {};
      let anchor = null;
      this.raw[typ].forEach((d) => {
        const t = dayjs(d.timestamp).valueOf();
        m[t] = (m[t] || 0) + d.count;
        if (anchor === null || t < anchor) {
          anchor = t;
        }
      });
      if (!this.form.from || !this.form.to) {
        return Object.keys(m).map((t) => [Number(t), m[t]]).sort((a, b) => a[0] - b[0]);
      }
      // Align the grid to a real data bucket so it matches the backend's hour
      // boundaries regardless of the DB session timezone; fall back to the hour
      // floor when this metric has no data of its own.
      const fromMs = dayjs(this.form.from).valueOf();
      const toMs = dayjs(this.form.to).valueOf();
      const base = anchor !== null ? anchor : Math.floor(fromMs / HOUR) * HOUR;
      const start = base - Math.ceil((base - fromMs) / HOUR) * HOUR;
      const out = [];
      for (let t = start; t <= toMs; t += HOUR) {
        out.push([t, m[t] || 0]);
      }
      return out;
    },

    statusClass(status) {
      return {
        finished: 'is-success',
        running: 'is-info',
        cancelled: 'is-danger',
        paused: 'is-warning',
        scheduled: 'is-link',
        draft: 'is-light',
      }[status] || 'is-light';
    },

    niceDateTime(d) {
      return dayjs(d).format('D MMM YYYY, HH:mm');
    },

    isCampaignSelected(camp) {
      return !this.form.campaigns.find(({ id }) => id === camp.id);
    },

    shortUrl(url) {
      try {
        const u = new URL(url);
        const s = u.hostname.replace(/^www\./, '') + u.pathname;
        return s.length > 48 ? `${s.slice(0, 48)}…` : s;
      } catch {
        return url;
      }
    },

    queryCampaigns(q) {
      this.isSearchLoading = true;
      this.$api.getCampaigns({ query: q, order_by: 'created_at', order: 'DESC' }).then((data) => {
        this.isSearchLoading = false;
        this.queriedCampaigns = data.results;
      });
    },

    onCampaignSelect(camp) {
      if (!camp) {
        this.form.campaigns = [];
        return;
      }
      this.form.campaigns = [camp];
      this.setWindow();
      this.$router.push({ query: { id: camp.id } }).catch(() => {});
      this.fetchAll();
    },

    // Window = the campaign's first 24 hours, but capped at the present hour when
    // 24h hasn't elapsed yet, so the chart stops at "now" instead of running on
    // into empty future hours. (Still well under 7 days, so the backend buckets hourly.)
    setWindow() {
      const start = this.campaign.startedAt
        ? dayjs(this.campaign.startedAt).startOf('hour')
        : dayjs().subtract(24, 'hour').startOf('hour');
      const end = start.add(24, 'hour');
      const now = dayjs();
      this.form.from = start.toDate();
      this.form.to = (end.isAfter(now) ? now : end).toDate();
    },

    fetchAll() {
      if (this.form.campaigns.length === 0) {
        return;
      }
      this.isLoading = true;
      this.urls = [];
      const params = {
        id: this.form.campaigns.map((c) => c.id),
        from: this.form.from,
        to: this.form.to,
      };
      const types = {
        views: this.$api.getCampaignViewCounts,
        clicks: this.$api.getCampaignClickCounts,
        bounces: this.$api.getCampaignBounceCounts,
        complaints: this.$api.getCampaignComplaintCounts,
        unsubscribes: this.$api.getCampaignUnsubscribeCounts,
        links: this.$api.getCampaignLinkCounts,
      };
      Promise.all(Object.entries(types).map(([typ, fn]) => fn(params).then((data) => {
        this.raw[typ] = data;
        this.counts[typ] = data.reduce((s, d) => s + d.count, 0);
        if (typ === 'links') {
          this.urls = data.map((l) => l.url);
        }
      }).catch(() => {
        this.raw[typ] = [];
        this.counts[typ] = 0;
      }))).finally(() => {
        this.isLoading = false;
      });
    },

    loadAndFetch(ids) {
      this.isSearchLoading = true;
      Promise.allSettled(ids.map((id) => this.$api.getCampaign(id))).then((data) => {
        data.forEach((d) => {
          if (d.status !== 'fulfilled') {
            return;
          }
          this.form.campaigns.push(d.value);
        });
        if (this.campaign.name) {
          this.campaignSearch = this.campaign.name;
        }
        this.setWindow();
        this.$nextTick(() => {
          this.isSearchLoading = false;
          this.fetchAll();
        });
      });
    },
  },

  created() {
    this.$root.$on('page.refresh', this.fetchAll);
  },

  destroyed() {
    this.$root.$off('page.refresh', this.fetchAll);
  },

  mounted() {
    const ids = this.$utils.parseQueryIDs(this.$route.query.id);
    if (ids.length > 0) {
      this.loadAndFetch(ids);
    }
  },
});
</script>

<style lang="scss" scoped>
// listmonk's component scoped styles don't import Bulma; mirror the few theme
// values we use here (Bulma defaults for greys, listmonk's blue for primary).
$grey: #7a7a7a;
$grey-light: #b5b5b5;
$grey-lighter: #dbdbdb;
$border: #dbdbdb;
$white: #fff;
$text-strong: #1f2937;

// Refined card tokens: hairline border + soft layered shadow, generous radius.
$card-radius: 14px;
$card-bd: 1px solid #ebeef3;
$card-sh: 0 1px 2px rgba(16, 24, 40, 0.04), 0 10px 28px rgba(16, 24, 40, 0.05);
$card-sh-hover: 0 2px 4px rgba(16, 24, 40, 0.05), 0 16px 34px rgba(16, 24, 40, 0.09);
$muted: #6b7686;

// Filter toolbar: a subtle tinted panel (not a stark white box). Flexbox rather
// than Bulma columns, so there are no negative margins to leak past the edges.
// Title bar: page title left, a low-key searchable campaign dropdown right.
.ca-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.6rem 1rem;
  margin-bottom: 1.5rem;

  .title {
    margin-bottom: 0;
  }
}

.ca-topbar-filter {
  margin-bottom: 0;
  flex: 0 1 320px;
  min-width: 220px;
}

@media screen and (max-width: 768px) {
  .ca-topbar-filter {
    flex: 1 1 100%;
  }
}

.ca-empty {
  text-align: center;
  padding: 5rem 1rem;
  color: $grey-light;

  ::v-deep .ca-empty-icon {
    color: $grey-lighter;
  }

  p {
    margin-top: 0.75rem;
    font-size: 1.05rem;
  }
}

.ca-camp-head {
  margin-bottom: 1.75rem;
}

.ca-camp-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.ca-camp-name {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.2;
  color: $text-strong;
}

.ca-status {
  font-weight: 600;
}

.ca-subject {
  color: $grey;
  font-size: 0.95rem;
  margin-top: 0.35rem;
}

// Inline label-value metadata strip.
.ca-camp-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.4rem 1.75rem;
  margin-top: 0.95rem;

  .ca-meta-item {
    display: inline-flex;
    align-items: baseline;
    gap: 0.4rem;
    min-width: 0;
  }

  .ca-meta-k {
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: $grey-light;
    white-space: nowrap;
  }

  .ca-meta-v {
    font-size: 0.9rem;
    font-weight: 500;
    color: $text-strong;
  }

  .ca-meta-lists .ca-meta-v {
    max-width: min(28rem, 100%);
    overflow-wrap: anywhere;
  }
}

// KPI cards: a responsive auto-fitting row.
.ca-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(168px, 1fr));
  gap: 1.1rem;
  margin-bottom: 1.75rem;
}

.ca-kpi {
  --accent: #{$grey};
  position: relative;
  background: $white;
  border: $card-bd;
  border-radius: $card-radius;
  padding: 1.15rem 1.25rem 1.1rem;
  box-shadow: $card-sh;
  display: flex;
  flex-direction: column;
  min-height: 118px;
  overflow: hidden;
  transition: box-shadow 0.18s ease, transform 0.18s ease;

  &:hover {
    box-shadow: $card-sh-hover;
    transform: translateY(-2px);
  }

  .ca-kpi-top {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .ca-kpi-label {
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

  .ca-kpi-value {
    font-size: 2rem;
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: $text-strong;
  }

  .ca-kpi-sub {
    font-size: 0.78rem;
    color: $muted;
  }

  // Rate progress bar at the foot of the card (replaces the old sparkline).
  .ca-kpi-bar {
    margin-top: auto;
    height: 8px;
    border-radius: 4px;
    background: #eef2f7;
    overflow: hidden;
  }

  .ca-kpi-bar-fill {
    height: 100%;
    border-radius: 4px;
    min-width: 4px;
    transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }
}

// Chart cards.
.ca-card {
  background: $white;
  border: $card-bd;
  border-radius: $card-radius;
  padding: 1.4rem 1.5rem;
  margin-bottom: 1.75rem;
  box-shadow: $card-sh;

  &.ca-card-full {
    height: 100%;
    margin-bottom: 0;
  }

  .ca-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.35rem;

    .title {
      margin-bottom: 0;
      font-size: 1rem;
      font-weight: 700;
      color: $text-strong;
    }
  }

  // Explainer line under the card title.
  .ca-card-desc {
    margin: 0 0 1.25rem;
    font-size: 0.78rem;
    line-height: 1.4;
    color: $muted;
  }
}

// Uniform vertical rhythm: normalise Bulma's .columns margins + the column
// vertical padding so the chart rows sit the same 1.75rem apart as the KPI grid
// and standalone cards (they were over-spaced by the stacked margins).
.ca-body .columns {
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

// Below desktop, stack the two-column rows full-width so neither card is
// squeezed at tablet / narrow-desktop widths (matches the Dashboard).
@media screen and (max-width: 1023px) {
  .ca-body .columns {
    display: block;
    margin-left: 0;
    margin-right: 0;

    .column {
      width: 100%;
      padding-left: 0;
      padding-right: 0;

      &:not(:last-child) {
        margin-bottom: 1.75rem;
      }
    }
  }
}

.ca-note {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: $grey;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

// Thin the Buefy select chevron in card heads (its default 3px border is heavy).
.ca-card-head ::v-deep .select:not(.is-multiple):not(.is-loading)::after {
  border-bottom-width: 1.5px;
  border-left-width: 1.5px;
}

.ca-note-empty {
  color: $grey;
  padding: 2rem 0;
  text-align: center;
}

.ca-table {
  .ca-table-name {
    font-weight: 500;
  }

  td, th {
    vertical-align: middle;
  }
}

.ca-links-table {
  table-layout: fixed;
  background: transparent;

  thead th {
    background: transparent;
    border: none;
    border-bottom: 2px solid #eef2f7;
    padding: 0 0.6rem 0.55rem;
    font-size: 0.64rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: $muted;
  }

  tbody td {
    border: none;
    border-bottom: 1px solid #f3f5f9;
    padding: 0.72rem 0.6rem;
    vertical-align: middle;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  tbody tr:hover td {
    background: #f8fafc;
  }

  // The URL column flexes and truncates; count/% columns stay narrow.
  .ca-link-url {
    max-width: 0;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    a {
      color: #0055d4;
      font-weight: 500;
    }
  }

  td:nth-child(2) {
    font-weight: 600;
    color: $text-strong;
  }

  th:not(:first-child), td:not(:first-child) {
    width: 5.5rem;
    white-space: nowrap;
  }
}

// Deliverability health gauges: rate vs. acceptable threshold (SES style).
.ca-health {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  padding-top: 0.25rem;
}

.ca-gauge-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.45rem;
}

.ca-gauge-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: $muted;
}

.ca-gauge-value {
  font-size: 1.15rem;
  font-weight: 700;
  color: $text-strong;
}

.ca-gauge-track {
  position: relative;
  height: 8px;
  border-radius: 4px;
  background: #eef2f7;
}

.ca-gauge-fill {
  height: 100%;
  border-radius: 4px;
  min-width: 3px;
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

// Thin, subtle "acceptable threshold" marker.
.ca-gauge-marker {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 2px;
  border-radius: 1px;
  background: #aab2bf;
  transform: translateX(-1px);
}

.ca-gauge-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  font-size: 0.78rem;
}

.ca-gauge-status {
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.ca-gauge-icon {
  width: 14px;
  height: 14px;
  flex: none;
}

.ca-gauge-thresh {
  color: $muted;
}

// Conversion ladder (replaces the funnel chart): labelled CSS progress bars.
.ca-ladder {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 1.15rem;
  height: 100%;
  padding: 0.25rem 0;
}

.ca-rung {
  .ca-rung-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.45rem;
  }

  .ca-rung-label {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: $muted;
  }

  .ca-rung-val {
    font-size: 1rem;
    font-weight: 700;
    color: $text-strong;
    white-space: nowrap;
  }

  .ca-rung-pct {
    font-size: 0.8rem;
    font-weight: 600;
    color: $muted;
    margin-left: 0.4rem;
  }

  .ca-rung-track {
    height: 14px;
    border-radius: 7px;
    background: #eef2f7;
    overflow: hidden;
  }

  .ca-rung-fill {
    height: 100%;
    border-radius: 7px;
    min-width: 4px;
    transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }
}

// Guard against horizontal overflow on small screens ONLY. On desktop this must
// stay off, otherwise it clips the cards' soft shadows at the page edges.
@media screen and (max-width: 768px) {
  .analytics {
    overflow-x: hidden;
  }
}

// Cards clip any chart that momentarily renders wider than its container
// (ApexCharts can size its SVG before the mobile layout settles).
.ca-card,
.ca-kpi {
  overflow: hidden;
}

::v-deep .vue-apexcharts {
  max-width: 100%;
}

::v-deep .apexcharts-canvas,
::v-deep .apexcharts-canvas svg {
  max-width: 100% !important;
}
</style>
