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
        icon-left="text-search" data-cy="fb-parse">
        {{ $t('import.facebook.parse') }}
      </b-button>
    </template>

    <template v-else>
      <b-notification :closable="false" type="is-info" role="status" data-cy="fb-summary">
        {{ $t('import.facebook.summary', {
          total: result.total,
          withEmail: result.rows.length,
          skipped: result.skippedNoEmail,
          dupes: result.skippedDuplicate,
        }) }}
      </b-notification>

      <list-selector :label="$t('globals.terms.lists')"
        :placeholder="$t('globals.terms.lists')" :message="$t('import.facebook.listHelp')"
        v-model="selectedLists" :selected="selectedLists" :all="lists.results"
        data-cy="fb-lists" />

      <b-table :data="result.rows" checkable :checked-rows.sync="checkedRows"
        narrowed paginated per-page="25" data-cy="fb-table" class="mt-4">
        <b-table-column field="name" :label="$t('globals.terms.name')" v-slot="props">
          {{ props.row.name }}
        </b-table-column>
        <b-table-column field="email" :label="$t('globals.terms.email')" v-slot="props">
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

      <p v-if="selectedLists.length === 0" class="has-text-danger mt-2" data-cy="fb-nolist">
        {{ $t('import.facebook.noList') }}
      </p>

      <div class="buttons mt-4">
        <b-button @click="onReset" icon-left="arrow-left" data-cy="fb-back">
          {{ $t('globals.buttons.back') }}
        </b-button>
        <b-button type="is-primary"
          :disabled="checkedRows.length === 0 || selectedLists.length === 0 || isProcessing"
          :loading="isProcessing" @click="onImport" icon-left="upload" data-cy="fb-import">
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
