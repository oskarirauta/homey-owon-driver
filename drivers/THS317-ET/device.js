'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class THS317ET extends ZigBeeDevice {

  log(...args) {
    const timestamp = new Date().toISOString();
    const deviceId = this.getData().id || this.getData().token;
    const deviceName = this.getName();
    console.log(`${timestamp} [Device: ${deviceName}] -`, ...args);
  }
  
  async onNodeInit({ zclNode }) {

    //this.enableDebug();
    //debug(true);

    this.disableDebug();
    debug(false);

    if (!this.hasCapability("measure_voltage")) {
      await this.addCapability("measure_voltage");
      this.log("Added 'measure_voltage' capability to device ", this.getName());
    }

    if (this.isFirstInit()) {

      this.log("Set batteryPercentageRemaining");
      await this.configureAttributeReporting([
        {
          endpointId: 1,
          cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: "batteryPercentageRemaining",
          minInterval: 65535,
          maxInterval: 0,
          minChange: 0,
        },
      ]);

      this.log("Set batteryVoltage precision");
      await this.configureAttributeReporting([
        {
          endpointId: 1,
          cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: "batteryVoltage",
          minInterval: 30,
          maxInterval: 3600,
          minChange: 1
        }
      ]);

    }

    // measure_temperature
    zclNode.endpoints[1].clusters[CLUSTER.TEMPERATURE_MEASUREMENT.NAME]
    .on('attr.measuredValue', this.onTemperatureMeasuredAttributeReport.bind(this));

    // measure_voltage
    zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
    .on('attr.batteryVoltage', this.onBatteryVoltageAttributeReport.bind(this));

    // measure_battery
    zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
    .on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));

  }

  onTemperatureMeasuredAttributeReport(measuredValue) {
    const temperatureOffset = this.getSetting('temperature_offset') || 0;
    const parsedValue = this.getSetting('temperature_decimals') === '2' ? Math.round((measuredValue / 100) * 100) / 100 : Math.round((measuredValue / 100) * 10) / 10;
    this.log('measure_temperature | temperatureMeasurement - measuredValue (temperature):', parsedValue, '+ temperature offset', temperatureOffset);
    this.setCapabilityValue('measure_temperature', parsedValue + temperatureOffset).catch(this.error);
  }

  onBatteryVoltageAttributeReport(batteryVoltage) {
    const voltage = batteryVoltage * 0.1;
    this.log("measure_voltage | powerConfiguration - batteryVoltage (v): ", batteryVoltage * 0.1);
    this.setCapabilityValue('measure_voltage', batteryVoltage * 0.1).catch(this.error);
  }

  onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
    const batteryThreshold = this.getSetting('batteryThreshold') || 20;
    this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", batteryPercentageRemaining * 0.5);
    this.setCapabilityValue('measure_battery', batteryPercentageRemaining * 0.5).catch(this.error);
    this.setCapabilityValue('alarm_battery', (batteryPercentageRemaining * 0.5 < batteryThreshold) ? true : false).catch(this.error);
  }
  
  async onSettings(settingsEvent) {
    if (settingsEvent.changedKeys.includes("temperature_offset")) {
      const temperatureOffset = newSettings.temperature_offset;
      this.log('Device ${this.getName()} temperature offset: ${temperatureOffset}°C');
    }
  }
 
  async onEndDeviceAnnounce() {
    if (!this.getAvailable()) {
      await this.setAvailable() // Mark the device as available upon re-announcement
      .then(() => this.log('Device is now available'))
      .catch(err => this.error('Error setting device available', err));
    }

  }

  onDeleted(){
    this.log("Temperature sensor THS317-ET removed")
  }

}

module.exports = THS317ET;
