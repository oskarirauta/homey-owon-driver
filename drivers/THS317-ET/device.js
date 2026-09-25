'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

const TEMPERATURE_SCALE = 100;
const BATTERY_VOLTAGE_SCALE = 10;
const ZCL_INVALID_TEMPERATURE = -32768;

class THS317ETDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.temperatureMeasurementCluster = zclNode.endpoints[1].clusters[CLUSTER.TEMPERATURE_MEASUREMENT.NAME];

    this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
      get: 'measuredValue',
      report: 'measuredValue',
      getOpts: {
        getOnStart: true,
        getOnOnline: true,
      },
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 1,
          maxInterval: 3600,
          minChange: 10,
        },
      },
      reportParser: (value) => this.parseTemperature(value),
    });

    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryPercentageRemaining',
      report: 'batteryPercentageRemaining',
      getOpts: {
        getOnStart: true,
        getOnOnline: true,
      },
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 60,
          maxInterval: 3600,
          minChange: 2,
        },
      },
      reportParser: (value) => Math.min(100, value / 2),
    });

    this.registerCapability('measure_voltage', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryVoltage',
      report: 'batteryVoltage',
      getOpts: {
        getOnStart: true,
        getOnOnline: true,
      },
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 30,
          maxInterval: 3600,
          minChange: 1,
        },
      },
      reportParser: (value) => value / BATTERY_VOLTAGE_SCALE,
    });

    this.registerCapability('alarm_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryPercentageRemaining',
      report: 'batteryPercentageRemaining',
      getOpts: {
        getOnStart: true,
        getOnOnline: true,
      },
      reportOpts: {
        configureAttributeReporting: false,
      },
      reportParser: (value) => (value / 2) <= this.getBatteryThreshold(),
    });
  }

  parseTemperature(value, settings = this.getSettings()) {
    if (!Number.isFinite(value) || value === ZCL_INVALID_TEMPERATURE) {
      return null;
    }

    const temperature = value / TEMPERATURE_SCALE;
    const offset = Number(settings.temperature_offset) || 0;
    const decimals = Number.parseInt(settings.temperature_decimals, 10) === 2 ? 2 : 1;

    return Number((temperature + offset).toFixed(decimals));
  }

  getBatteryThreshold(settings = this.getSettings()) {
    const threshold = Number(settings.batteryThreshold);
    return Number.isFinite(threshold) ? threshold : 20;
  }

  async onSettings({ newSettings, changedKeys }) {
    if (changedKeys.includes('temperature_offset') || changedKeys.includes('temperature_decimals')) {
      await this.refreshTemperature(newSettings);
    }

    if (changedKeys.includes('batteryThreshold')) {
      const batteryLevel = this.getCapabilityValue('measure_battery');
      if (Number.isFinite(batteryLevel)) {
        await this.setCapabilityValue('alarm_battery', batteryLevel <= this.getBatteryThreshold(newSettings));
      }
    }
  }

  async refreshTemperature(settings = this.getSettings()) {
    try {
      const { measuredValue } = await this.temperatureMeasurementCluster.readAttributes('measuredValue');
      const temperature = this.parseTemperature(measuredValue, settings);

      if (temperature !== null) {
        await this.setCapabilityValue('measure_temperature', temperature);
      }
    } catch (error) {
      this.error('Could not refresh the temperature after changing settings', error);
    }
  }

}

module.exports = THS317ETDevice;
