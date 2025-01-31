/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency';
import { inject as service } from '@ember/service';
import errorMessage from 'vault/utils/error-message';

/**
 * @module KvSecretEdit is used for creating a new version of a secret
 *
 * <Page::Secret::Edit
 *  @secret={{this.model.newVersion}}
 *  @previousVersion={{this.model.secret.version}}
 *  @currentVersion={{this.model.metadata.currentVersion}}
 *  @breadcrumbs={{this.breadcrumbs}
 * />
 *
 * @param {model} secret - Ember data model: 'kv/data', the new record for the new secret version saved by the form
 * @param {number} previousVersion - previous secret version number
 * @param {number} currentVersion - current secret version, comes from the metadata endpoint
 * @param {array} breadcrumbs - breadcrumb objects to render in page header
 */

export default class KvSecretEdit extends Component {
  @service controlGroup;
  @service flashMessages;
  @service router;

  @tracked showJsonView = false;
  @tracked errorMessage;
  @tracked modelValidations;
  @tracked invalidFormAlert;

  get showOldVersionAlert() {
    const { currentVersion, previousVersion } = this.args;
    // isNew check prevents alert from flashing after save but before route transitions
    if (!currentVersion || !previousVersion || !this.args.secret.isNew) return false;
    if (currentVersion !== previousVersion) return true;
    return false;
  }

  @action
  toggleJsonView() {
    this.showJsonView = !this.showJsonView;
  }

  @task
  *save(event) {
    event.preventDefault();
    try {
      const { isValid, state, invalidFormMessage } = this.args.secret.validate();
      this.modelValidations = isValid ? null : state;
      this.invalidFormAlert = invalidFormMessage;
      if (isValid) {
        const { secret } = this.args;
        yield this.args.secret.save();
        this.flashMessages.success(`Successfully created new version of ${secret.path}.`);
        // transition to parent secret route to re-query latest version
        this.router.transitionTo('vault.cluster.secrets.backend.kv.secret');
      }
    } catch (error) {
      let message = errorMessage(error);
      if (error.message === 'Control Group encountered') {
        this.controlGroup.saveTokenFromError(error);
        const err = this.controlGroup.logFromError(error);
        message = err.content;
      }
      this.errorMessage = message;
      this.invalidFormAlert = 'There was an error submitting this form.';
    }
  }

  @action
  onCancel() {
    this.router.transitionTo('vault.cluster.secrets.backend.kv.secret.details');
  }
}
