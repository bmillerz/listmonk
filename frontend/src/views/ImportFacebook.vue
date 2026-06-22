<template>
  <section class="import-facebook">
    <h1 class="title is-4">{{ $t('import.facebook.title') }}</h1>
    <p class="has-text-grey mb-5">{{ $t('import.facebook.help') }}</p>

    <template v-if="!parsed">
      <b-field :label="$t('import.facebook.pasteLabel')">
        <b-input v-model="rawText" type="textarea" rows="14"
          :placeholder="$t('import.facebook.pastePlaceholder')" data-cy="fb-text" />
      </b-field>
      <b-button type="is-primary" :disabled="!rawText.trim()" @click="onParse"
        icon-left="magnify" data-cy="fb-parse">
        {{ $t('import.facebook.parse') }}
      </b-button>
    </template>

    <template v-else>
      <div class="fb-summary" :class="hasImportable ? 'is-success' : 'is-error'"
        role="status" data-cy="fb-summary">
        <span class="fb-summary-icon" aria-hidden="true">
          <svg v-if="hasImportable" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="7.5" x2="12" y2="13" />
            <line x1="12" y1="16.5" x2="12" y2="16.5" />
          </svg>
        </span>
        <div class="fb-summary-text">
          <p class="fb-summary-title">
            {{ hasImportable ? $t('import.facebook.summaryReady', { n: result.rows.length })
              : $t('import.facebook.summaryNone') }}
          </p>
          <p class="fb-summary-counts">
            {{ $t('import.facebook.summary', {
              total: result.total,
              withEmail: result.rows.length,
              skipped: result.skippedNoEmail,
              dupes: result.skippedDuplicate,
            }) }}
          </p>
        </div>
      </div>

      <!-- Step 1: choose the destination list(s). -->
      <section class="fb-step" data-cy="fb-step-lists">
        <header class="fb-step-head">
          <span class="fb-step-num">1</span>
          <div>
            <h2 class="fb-step-title">{{ $t('import.facebook.step1Title') }}</h2>
          </div>
        </header>
        <list-selector :label="$t('globals.terms.lists')"
          :placeholder="$t('globals.terms.lists')" :message="$t('import.facebook.listHelp')"
          v-model="selectedLists" :selected="selectedLists" :all="lists.results"
          data-cy="fb-lists" />
        <p v-if="selectedLists.length === 0" class="fb-nolist" data-cy="fb-nolist">
          <svg class="fb-nolist-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
          </svg>
          {{ $t('import.facebook.noList') }}
        </p>
      </section>

      <!-- Step 2: review and pick who to import. -->
      <section class="fb-step" data-cy="fb-step-review">
        <header class="fb-step-head">
          <span class="fb-step-num">2</span>
          <div>
            <h2 class="fb-step-title">{{ $t('import.facebook.step2Title') }}</h2>
            <p class="fb-step-desc">{{ $t('import.facebook.step2Desc') }}</p>
          </div>
        </header>
        <b-table :data="result.rows" checkable :checked-rows.sync="checkedRows"
          narrowed paginated :per-page="25" scrollable data-cy="fb-table">
          <b-table-column field="name" :label="$t('globals.fields.name')" v-slot="props">
            {{ props.row.name }}
          </b-table-column>
          <b-table-column field="email" :label="$t('subscribers.email')" v-slot="props">
            {{ props.row.email }}
          </b-table-column>
          <b-table-column field="firstName" :label="$t('import.facebook.firstName')" v-slot="props">
            {{ props.row.firstName }}
          </b-table-column>
          <b-table-column field="lastName" :label="$t('import.facebook.lastName')" v-slot="props">
            {{ props.row.lastName }}
          </b-table-column>
          <b-table-column field="signupDate" :label="$t('import.facebook.signupDate')" v-slot="props">
            {{ props.row.signupDate }}
          </b-table-column>
          <b-table-column field="location" :label="$t('import.facebook.location')" v-slot="props">
            {{ props.row.location }}
          </b-table-column>
          <b-table-column field="visitedBefore" :label="$t('import.facebook.visitedBefore')" v-slot="props">
            {{ props.row.visitedBefore }}
          </b-table-column>
        </b-table>
      </section>

      <div class="buttons mt-4">
        <b-button @click="onReset" icon-left="chevron-left" data-cy="fb-back">
          {{ $t('globals.buttons.back') }}
        </b-button>
        <b-button type="is-primary"
          :disabled="checkedRows.length === 0 || selectedLists.length === 0 || isProcessing"
          :loading="isProcessing" @click="onImport" icon-left="file-upload-outline" data-cy="fb-import">
          {{ $t('import.facebook.importN', { n: checkedRows.length }) }}
        </b-button>
      </div>
    </template>
  </section>
</template>

<script>
import { mapState } from 'vuex';
import ListSelector from '../components/ListSelector.vue';
import { parseFacebookText, toImportCsv } from '../utils/facebookParser';

export default {
  name: 'ImportFacebook',

  components: { ListSelector },

  data() {
    return {
      rawText: '',
      parsed: false,
      result: {
        rows: [], total: 0, skippedNoEmail: 0, skippedDuplicate: 0,
      },
      checkedRows: [],
      selectedLists: [],
      isProcessing: false,
    };
  },

  computed: {
    ...mapState(['lists']),

    // Success when the parse yielded at least one importable (emailed) row;
    // otherwise the summary shows its red error variant.
    hasImportable() {
      return this.result.rows.length > 0;
    },
  },

  methods: {
    onParse() {
      this.result = parseFacebookText(this.rawText);
      this.checkedRows = [...this.result.rows];
      this.parsed = true;
    },

    onReset() {
      this.parsed = false;
      this.checkedRows = [];
    },

    onImport() {
      this.isProcessing = true;

      const csv = toImportCsv(this.checkedRows);
      const file = new File([csv], 'facebook-import.csv', { type: 'text/csv' });

      const params = new FormData();
      params.set('params', JSON.stringify({
        mode: 'subscribe',
        subscription_status: 'confirmed',
        delim: ',',
        lists: this.selectedLists.map((l) => l.id),
        overwrite_userinfo: false,
        overwrite_subscription_status: false,
      }));
      params.set('file', file);

      const n = this.checkedRows.length;
      this.$api.importSubscribers(params).then(() => {
        this.isProcessing = false;
        this.$utils.toast(this.$t('import.facebook.started', { n }));
        this.rawText = '';
        this.onReset();
      }, () => {
        this.isProcessing = false;
      });
    },
  },
};
</script>

<style lang="scss" scoped>
// Parse-result banner: an obvious green success state (rows ready to import)
// and a red error state (nothing with an email was found).
.fb-summary {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.95rem 1.15rem;
  border-radius: 12px;
  border: 1px solid transparent;
  margin-bottom: 1.25rem;

  .fb-summary-icon {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 50%;
    color: #fff;

    svg {
      width: 1.3rem;
      height: 1.3rem;
    }
  }

  .fb-summary-title {
    margin: 0;
    font-weight: 700;
    font-size: 1rem;
    line-height: 1.25;
  }

  .fb-summary-counts {
    margin: 0.15rem 0 0;
    font-size: 0.85rem;
    opacity: 0.85;
  }

  &.is-success {
    background: #ecfaf1;
    border-color: #c6efd6;
    color: #1f7a47;

    .fb-summary-icon {
      background: #2bb673;
    }
  }

  &.is-error {
    background: #fdecea;
    border-color: #f7c4bf;
    color: #c0392b;

    .fb-summary-icon {
      background: #e0524d;
    }
  }
}

// Stepped cards make the two actions — pick the list(s), then review & import —
// visually distinct so the list selector can't be missed.
.fb-step {
  background: #fff;
  border: 1px solid #e7e9ee;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(20, 30, 50, 0.05);
  padding: 1.25rem 1.4rem 1.4rem;
  margin-bottom: 1.25rem;
}

.fb-step-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.fb-step-num {
  flex: none;
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 50%;
  background: #0055d4;
  color: #fff;
  font-weight: 700;
  font-size: 0.95rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.fb-step-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.2;
  color: #1f2733;
}

.fb-step-desc {
  margin: 0.2rem 0 0;
  font-size: 0.82rem;
  line-height: 1.4;
  color: #7a828e;
}

// Small amber hint shown until a list is picked — a gentle nudge, not a heavy
// error block.
.fb-nolist {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0.7rem 0 0;
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  background: #fff5e0;
  border: 1px solid #fbe3b0;
  color: #9a6a12;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.2;

  .fb-nolist-icon {
    flex: none;
    width: 0.95rem;
    height: 0.95rem;
  }
}

// Slightly tighten the list-selector field's bottom margin (Buefy default is
// 1.5rem) without adding margin when it's the last element.
.fb-step ::v-deep .field.list-selector:not(:last-child) {
  margin-bottom: 1rem;
}
</style>
