'use strict';

const Homey = require('homey');

class OWON extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('OWON has been initialized');
  }

}

module.exports = OWON;
