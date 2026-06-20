<template>
  <section class="analytics content relative">
    <h1 class="title is-4">
      {{ $t('analytics.title') }}
    </h1>

    <div v-if="serverConfig.privacy.disable_tracking || !serverConfig.privacy.individual_tracking"
      class="notification is-warning is-light">
      <template v-if="serverConfig.privacy.disable_tracking">
        {{ $t('analytics.trackingDisabled') }}
      </template>
      <template v-else-if="!serverConfig.privacy.individual_tracking">
        {{ $t('analytics.nonIndividualTracking') }}
      </template>
    </div>

    <!-- Controls: campaign picker + date range. -->
    <form class="box ca-controls" @submit.prevent="onSubmit">
      <div class="columns is-vcentered">
        <div class="column is-5">
          <b-field :label="$t('globals.terms.campaigns')" label-position="on-border">
            <b-taginput v-model="form.campaigns" :data="queriedCampaigns" name="campaigns" ellipsis icon="tag-outline"
              :placeholder="$t('globals.terms.campaigns')" autocomplete :allow-new="false" :open-on-focus="true"
              :before-adding="isCampaignSelected" @typing="queryCampaigns" @focus="queryCampaigns" field="name"
              :loading="isSearchLoading" />
          </b-field>
        </div>

        <div class="column">
          <div class="columns">
            <div class="column is-6">
              <b-field data-cy="from" :label="$t('analytics.fromDate')" label-position="on-border">
                <b-datetimepicker v-model="form.from" icon="calendar-clock" :timepicker="{ hourFormat: '24' }"
                  :datetime-formatter="formatDateTime" @input="onFromDateChange" />
              </b-field>
            </div>
            <div class="column is-6">
              <b-field data-cy="to" :label="$t('analytics.toDate')" label-position="on-border">
                <b-datetimepicker v-model="form.to" icon="calendar-clock" :timepicker="{ hourFormat: '24' }"
                  :datetime-formatter="formatDateTime" @input="onToDateChange" />
              </b-field>
            </div>
          </div>
        </div>

        <div class="column is-narrow">
          <b-button native-type="submit" type="is-primary" icon-left="magnify" :label="$t('globals.buttons.view')"
            :disabled="form.campaigns.length === 0" data-cy="btn-search" />
        </div>
      </div>
    </form>

    <!-- Empty state. -->
    <div v-if="form.campaigns.length === 0" class="ca-empty">
      <b-icon icon="chart-timeline-variant" size="is-large" custom-class="ca-empty-icon" />
      <p>{{ $t('analytics.selectCampaign') }}</p>
    </div>

    <div v-else class="ca-body relative">
      <b-loading :active="isLoading" :is-full-page="false" />

      <!-- Campaign context header. -->
      <header class="ca-camp-head">
        <div class="ca-camp-title">
          <div class="ca-title-row">
            <h2 class="title is-5">
              <template v-if="isSingle">{{ campaign.name }}</template>
              <template v-else>{{ form.campaigns.length }} {{ $tc('globals.terms.campaign', form.campaigns.length) }}</template>
            </h2>
            <span v-if="isSingle && campaign.status" class="tag is-rounded ca-status"
              :class="statusClass(campaign.status)">
              {{ $t(`campaigns.status.${campaign.status}`) }}
            </span>
          </div>
          <p v-if="isSingle && campaign.subject" class="ca-subject">{{ campaign.subject }}</p>
        </div>
        <dl v-if="isSingle" class="ca-camp-meta">
          <div v-if="campaign.startedAt" class="ca-meta-item">
            <dt>{{ $t('analytics.sent') }}</dt>
            <dd>{{ niceDateTime(campaign.startedAt) }}</dd>
          </div>
          <div class="ca-meta-item">
            <dt>{{ $t('analytics.recipients') }}</dt>
            <dd>{{ $utils.niceNumber(campaign.sent) }}</dd>
          </div>
          <div v-if="campaign.lists && campaign.lists.length" class="ca-meta-item ca-meta-lists">
            <dt>{{ $tc('globals.terms.list', campaign.lists.length) }}</dt>
            <dd>{{ campaign.lists.map((l) => l.name).join(', ') }}</dd>
          </div>
        </dl>
      </header>

      <!-- KPI cards. -->
      <div class="ca-kpis">
        <div v-for="k in kpiCards" :key="k.key" class="ca-kpi" :style="{ '--accent': k.color }">
          <div class="ca-kpi-top">
            <span class="ca-kpi-label">{{ k.label }}</span>
            <span class="ca-kpi-value">{{ k.value }}</span>
            <span class="ca-kpi-sub">{{ k.sub }}</span>
          </div>
          <apexchart v-if="k.spark && !isLoading" type="area" height="34" :options="sparkOptions(k.color)"
            :series="k.spark" />
        </div>
      </div>

      <!-- Hero: engagement over time. -->
      <div class="ca-card">
        <div class="ca-card-head">
          <h3 class="title is-6">{{ $t('analytics.engagementOverTime') }}</h3>
        </div>
        <apexchart v-if="!isLoading" type="area" height="320" :options="engagementOptions" :series="engagementSeries" />
        <p class="ca-note">
          <b-icon icon="information-outline" size="is-small" /> {{ $t('analytics.opensIndicative') }}
        </p>
      </div>

      <!-- Single campaign: funnel + top links. -->
      <div v-if="isSingle" class="columns">
        <div class="column is-5">
          <div class="ca-card ca-card-full">
            <div class="ca-card-head">
              <h3 class="title is-6">{{ $t('analytics.funnel') }}</h3>
            </div>
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
              <h3 class="title is-6">{{ $t('analytics.topLinks') }}</h3>
            </div>
            <apexchart v-if="!isLoading && raw.links.length" type="bar" :height="linksHeight" :options="linksOptions"
              :series="linksSeries" />
            <p v-else-if="!isLoading" class="ca-note-empty">{{ $t('analytics.noLinks') }}</p>
          </div>
        </div>
      </div>

      <!-- Multiple campaigns: comparison table. -->
      <div v-else class="ca-card">
        <div class="ca-card-head">
          <h3 class="title is-6">{{ $t('analytics.comparison') }}</h3>
        </div>
        <div class="table-container">
        <table class="table is-fullwidth is-hoverable ca-table">
          <thead>
            <tr>
              <th>{{ $tc('globals.terms.campaign', 1) }}</th>
              <th class="has-text-right">{{ $t('analytics.recipients') }}</th>
              <th class="has-text-right">{{ $t('analytics.openRate') }}</th>
              <th class="has-text-right">{{ $t('analytics.clickRate') }}</th>
              <th class="has-text-right">{{ $t('analytics.bounceRate') }}</th>
              <th class="has-text-right">{{ $t('analytics.unsubRate') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in perCampaign" :key="c.id">
              <td class="ca-table-name">{{ c.name }}</td>
              <td class="has-text-right">{{ $utils.niceNumber(c.sent) }}</td>
              <td class="has-text-right">{{ c.openRate }}%</td>
              <td class="has-text-right">{{ c.clickRate }}%</td>
              <td class="has-text-right">{{ c.bounceRate }}%</td>
              <td class="has-text-right">{{ c.unsubRate }}%</td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      <!-- Deliverability: bounces + unsubscribes over time. -->
      <div class="ca-card">
        <div class="ca-card-head">
          <h3 class="title is-6">{{ $t('analytics.deliverability') }}</h3>
        </div>
        <apexchart v-if="!isLoading" type="area" height="220" :options="deliverabilityOptions"
          :series="deliverabilitySeries" />
      </div>
    </div>
  </section>
</template>

<script>
import dayjs from 'dayjs';
import Vue from 'vue';
import { mapState } from 'vuex';
import VueApexCharts from 'vue-apexcharts';

// Semantic palette, drawn from listmonk's existing chart colours so the page
// stays cohesive with the rest of the admin.
const C = {
  opens: '#0055d4',
  clicks: '#41AC9C',
  ctor: '#3a82d6',
  delivered: '#6c8fd6',
  bounces: '#ee7d5b',
  unsubs: '#FFB50D',
  neutral: '#8a97a8',
};
// Per-series palette for the multi-campaign overlay and the top-links bars.
const SERIES_PALETTE = ['#0055d4', '#41AC9C', '#FFB50D', '#ee7d5b', '#7FC7BC', '#3a82d6', '#688ED9', '#FFC43D'];
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

      // Raw per-type time-series ([{ campaignId, count, timestamp }]) and the
      // link breakdown ([{ url, count }]), plus the matching click-through URLs.
      raw: {
        views: [], clicks: [], bounces: [], unsubscribes: [], links: [],
      },
      counts: {
        views: 0, clicks: 0, bounces: 0, unsubscribes: 0, links: 0,
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

    isSingle() {
      return this.form.campaigns.length === 1;
    },

    campaign() {
      return this.form.campaigns[0] || {};
    },

    // Denominator for all the rates.
    totalSent() {
      return this.form.campaigns.reduce((sum, c) => sum + (c.sent || 0), 0);
    },

    // The six headline metric cards.
    kpiCards() {
      const opens = this.counts.views;
      const { clicks } = this.counts;
      const ctor = opens ? Math.round((clicks / opens) * 1000) / 10 : 0;

      return [
        {
          key: 'recipients',
          label: this.$t('analytics.recipients'),
          value: this.$utils.niceNumber(this.totalSent),
          sub: this.isSingle && this.campaign.startedAt
            ? this.niceDateTime(this.campaign.startedAt)
            : this.$tc('globals.terms.campaign', this.form.campaigns.length),
          color: C.neutral,
          spark: null,
        },
        {
          key: 'open',
          label: this.$t('analytics.openRate'),
          value: `${this.rate(opens)}%`,
          sub: `${this.$utils.niceNumber(opens)} ${this.$t('campaigns.views').toLowerCase()}`,
          color: C.opens,
          spark: this.spark('views'),
        },
        {
          key: 'click',
          label: this.$t('analytics.clickRate'),
          value: `${this.rate(clicks)}%`,
          sub: `${this.$utils.niceNumber(clicks)} ${this.$t('campaigns.clicks').toLowerCase()}`,
          color: C.clicks,
          spark: this.spark('clicks'),
        },
        {
          key: 'ctor',
          label: this.$t('analytics.clickToOpenRate'),
          value: `${ctor}%`,
          sub: this.$t('analytics.clicksPerOpen'),
          color: C.ctor,
          spark: null,
        },
        {
          key: 'bounce',
          label: this.$t('analytics.bounceRate'),
          value: `${this.rate(this.counts.bounces)}%`,
          sub: `${this.$utils.niceNumber(this.counts.bounces)} ${this.$t('globals.terms.bounces').toLowerCase()}`,
          color: C.bounces,
          spark: this.spark('bounces'),
        },
        {
          key: 'unsub',
          label: this.$t('analytics.unsubRate'),
          value: `${this.rate(this.counts.unsubscribes)}%`,
          sub: `${this.$utils.niceNumber(this.counts.unsubscribes)} ${this.$t('campaigns.unsubscribes').toLowerCase()}`,
          color: C.unsubs,
          spark: this.spark('unsubscribes'),
        },
      ];
    },

    engagementSeries() {
      if (this.isSingle) {
        return [
          { name: this.$t('campaigns.views'), data: this.pts('views') },
          { name: this.$t('campaigns.clicks'), data: this.pts('clicks') },
        ];
      }
      return this.form.campaigns.map((c) => ({ name: c.name, data: this.ptsForCamp('views', c.id) }));
    },

    engagementOptions() {
      return this.areaBase(this.isSingle ? [C.opens, C.clicks] : SERIES_PALETTE, 320);
    },

    // Conversion ladder stages (relative to sent), rendered as CSS progress bars.
    funnelStages() {
      const sent = this.totalSent;
      const delivered = Math.max(sent - this.counts.bounces, 0);
      const pct = (n) => (sent ? Math.round((n / sent) * 1000) / 10 : 0);
      return [
        {
          key: 'sent', label: this.$t('analytics.sent'), count: sent, pct: 100, color: C.neutral,
        },
        {
          key: 'delivered', label: this.$t('analytics.delivered'), count: delivered, pct: pct(delivered), color: C.delivered,
        },
        {
          key: 'opened', label: this.$t('analytics.opened'), count: this.counts.views, pct: pct(this.counts.views), color: C.opens,
        },
        {
          key: 'clicked', label: this.$t('analytics.clicked'), count: this.counts.clicks, pct: pct(this.counts.clicks), color: C.clicks,
        },
      ];
    },

    linksSeries() {
      return [{ name: this.$t('campaigns.clicks'), data: this.raw.links.map((l) => l.count) }];
    },

    linksHeight() {
      return Math.max(this.raw.links.length * 34 + 30, 160);
    },

    linksOptions() {
      return {
        chart: {
          type: 'bar',
          fontFamily: 'inherit',
          toolbar: { show: false },
          events: {
            dataPointSelection: (e, ctx, cfg) => {
              const u = this.urls[cfg.dataPointIndex];
              if (u) {
                window.open(u, '_blank', 'noopener noreferrer');
              }
            },
          },
        },
        plotOptions: {
          bar: {
            horizontal: true, distributed: true, barHeight: '68%', borderRadius: 3,
          },
        },
        colors: SERIES_PALETTE,
        dataLabels: {
          enabled: true,
          textAnchor: 'start',
          offsetX: 4,
          formatter: (val) => this.$utils.niceNumber(val),
          style: { colors: ['#fff'], fontSize: '11px', fontWeight: 600 },
        },
        xaxis: {
          categories: this.raw.links.map((l) => this.shortUrl(l.url)),
          labels: { style: { colors: AXIS } },
          axisBorder: { show: false },
          axisTicks: { show: false },
        },
        yaxis: { labels: { style: { colors: '#3b4754', fontSize: '12px' } } },
        grid: { borderColor: GRID, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
        legend: { show: false },
        tooltip: { y: { title: { formatter: () => `${this.$t('campaigns.clicks')}:` } } },
      };
    },

    deliverabilitySeries() {
      return [
        { name: this.$t('globals.terms.bounces'), data: this.pts('bounces') },
        { name: this.$t('campaigns.unsubscribes'), data: this.pts('unsubscribes') },
      ];
    },

    deliverabilityOptions() {
      return this.areaBase([C.bounces, C.unsubs], 220);
    },

    // Per-campaign rate breakdown for the multi-campaign comparison table.
    perCampaign() {
      return this.form.campaigns.map((c) => {
        const sum = (typ) => this.raw[typ]
          .filter((d) => d.campaignId === c.id)
          .reduce((s, d) => s + d.count, 0);
        const r = (n) => (c.sent ? Math.round((n / c.sent) * 1000) / 10 : 0);
        return {
          id: c.id,
          name: c.name,
          sent: c.sent,
          openRate: r(sum('views')),
          clickRate: r(sum('clicks')),
          bounceRate: r(sum('bounces')),
          unsubRate: r(sum('unsubscribes')),
        };
      });
    },
  },

  methods: {
    // Rate of a count as a percentage of total sent, one decimal.
    rate(n) {
      return this.totalSent ? Math.round((n / this.totalSent) * 1000) / 10 : 0;
    },

    // Time-series points [ms, count] for a type, summed across the selected
    // campaigns and bucketed by the backend's timestamp.
    pts(typ) {
      const m = {};
      this.raw[typ].forEach((d) => {
        const t = dayjs(d.timestamp).valueOf();
        m[t] = (m[t] || 0) + d.count;
      });
      return Object.keys(m).map((t) => [Number(t), m[t]]).sort((a, b) => a[0] - b[0]);
    },

    ptsForCamp(typ, id) {
      return this.raw[typ]
        .filter((d) => d.campaignId === id)
        .map((d) => [dayjs(d.timestamp).valueOf(), d.count])
        .sort((a, b) => a[0] - b[0]);
    },

    spark(typ) {
      const pts = this.pts(typ);
      return pts.length ? [{ data: pts }] : null;
    },

    // Shared area-chart options so the hero and deliverability charts match.
    areaBase(colors, height) {
      return {
        chart: {
          type: 'area',
          height,
          fontFamily: 'inherit',
          toolbar: { show: false },
          zoom: { enabled: false },
          animations: { easing: 'easeinout', speed: 400 },
        },
        colors,
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        fill: {
          type: 'gradient',
          gradient: {
            shadeIntensity: 1, opacityFrom: 0.32, opacityTo: 0.02, stops: [0, 95],
          },
        },
        grid: { borderColor: GRID, strokeDashArray: 4, padding: { left: 12, right: 12 } },
        xaxis: {
          type: 'datetime',
          labels: { datetimeUTC: false, style: { colors: AXIS } },
          axisBorder: { show: false },
          axisTicks: { show: false },
        },
        yaxis: {
          min: 0,
          forceNiceScale: true,
          labels: { formatter: (v) => this.$utils.niceNumber(Math.round(v)), style: { colors: AXIS } },
        },
        legend: {
          show: true, position: 'top', horizontalAlign: 'right', fontFamily: 'inherit', markers: { radius: 6 },
        },
        tooltip: { x: { format: 'dd MMM HH:mm' }, theme: 'light' },
      };
    },

    sparkOptions(color) {
      return {
        chart: { type: 'area', sparkline: { enabled: true }, animations: { enabled: false } },
        stroke: { curve: 'smooth', width: 1.5 },
        fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
        colors: [color],
        tooltip: { enabled: false },
      };
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

    onFromDateChange() {
      if (this.form.from > this.form.to) {
        this.form.to = dayjs(this.form.from).add(7, 'day').toDate();
      }
    },

    onToDateChange() {
      if (this.form.from > this.form.to) {
        this.form.from = dayjs(this.form.to).add(-7, 'day').toDate();
      }
    },

    formatDateTime(s) {
      return dayjs(s).format('YYYY-MM-DD HH:mm');
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
        this.queriedCampaigns = data.results.map((c) => {
          const camp = c;
          camp.name = `#${c.id}: ${c.name}`;
          return camp;
        });
      });
    },

    onSubmit() {
      this.$router.push({
        query: {
          id: this.form.campaigns.map((c) => c.id),
          from: dayjs(this.form.from).unix(),
          to: dayjs(this.form.to).unix(),
        },
      }).catch(() => {});
      this.fetchAll();
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
        this.$nextTick(() => {
          this.isSearchLoading = false;
          this.fetchAll();
        });
      });
    },
  },

  created() {
    const now = dayjs().set('hour', 23).set('minute', 59).set('seconds', 0);
    const weekAgo = now.subtract(7, 'day').set('hour', 0).set('minute', 0);
    this.form.from = (this.$route.query.from ? dayjs.unix(this.$route.query.from) : weekAgo).toDate();
    this.form.to = (this.$route.query.to ? dayjs.unix(this.$route.query.to) : now).toDate();
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
$text-strong: #363636;

.ca-controls {
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;

  // The inner .columns is :last-child, so Bulma gives it a -0.75rem bottom
  // margin; cancel it so the box's bottom padding matches the top.
  .columns:last-child {
    margin-bottom: 0;
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
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem 2.5rem;
  margin-bottom: 1.75rem;
}

.ca-camp-title {
  min-width: 0;

  .ca-title-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.6rem;

    .title {
      margin-bottom: 0;
    }
  }

  .ca-subject {
    color: $grey;
    font-size: 0.95rem;
    margin-top: 0.4rem;
  }
}

.ca-status {
  font-weight: 600;
}

// Labelled metadata strip: small uppercase label above each value.
.ca-camp-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.75rem 2rem;
  margin: 0;

  .ca-meta-item {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;

    dt {
      font-size: 0.64rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: $grey-light;
    }

    dd {
      margin: 0;
      font-size: 0.92rem;
      font-weight: 500;
      color: $text-strong;
    }
  }

  .ca-meta-lists dd {
    max-width: 24rem;
    overflow-wrap: anywhere;
  }
}

// KPI cards: a responsive auto-fitting row.
.ca-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.ca-kpi {
  --accent: #{$grey};
  background: $white;
  border: 1px solid $border;
  border-left: 3px solid var(--accent);
  border-radius: 8px;
  padding: 0.9rem 1rem 0.4rem;
  box-shadow: 0 1px 2px rgba(10, 30, 60, 0.04);
  display: flex;
  flex-direction: column;
  min-height: 104px;
  transition: box-shadow 0.15s ease, transform 0.15s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(10, 30, 60, 0.08);
    transform: translateY(-1px);
  }

  .ca-kpi-top {
    display: flex;
    flex-direction: column;
  }

  .ca-kpi-label {
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 0.68rem;
    font-weight: 600;
    color: $grey;
  }

  .ca-kpi-value {
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1.2;
    color: $text-strong;
  }

  .ca-kpi-sub {
    font-size: 0.78rem;
    color: $grey;
  }

  ::v-deep .vue-apexcharts {
    margin-top: auto;
  }
}

// Chart cards.
.ca-card {
  background: $white;
  border: 1px solid $border;
  border-radius: 8px;
  padding: 1.1rem 1.25rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 2px rgba(10, 30, 60, 0.04);

  &.ca-card-full {
    height: calc(100% - 1.5rem);
  }

  .ca-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;

    .title {
      margin-bottom: 0;
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

// Conversion ladder (replaces the funnel chart): labelled CSS progress bars.
.ca-ladder {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1.15rem;
  height: 100%;
  padding: 0.4rem 0;
}

.ca-rung {
  .ca-rung-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.3rem;
  }

  .ca-rung-label {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: $grey;
  }

  .ca-rung-val {
    font-size: 0.95rem;
    font-weight: 700;
    color: $text-strong;
    white-space: nowrap;
  }

  .ca-rung-pct {
    font-size: 0.8rem;
    font-weight: 600;
    color: $grey;
    margin-left: 0.4rem;
  }

  .ca-rung-track {
    height: 12px;
    border-radius: 6px;
    background: #f1f4f8;
    overflow: hidden;
  }

  .ca-rung-fill {
    height: 100%;
    border-radius: 6px;
    min-width: 2px;
    transition: width 0.5s ease;
  }
}

// Guard against any horizontal overflow on small screens: charts stay within
// their container and the page never scrolls sideways. The comparison table
// scrolls inside its own .table-container instead.
.analytics {
  overflow-x: hidden;
}

::v-deep .apexcharts-canvas {
  max-width: 100%;
}
</style>
