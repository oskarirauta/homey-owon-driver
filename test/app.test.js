'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

describe('Homey app manifest', () => {
  const composeManifest = JSON.parse(fs.readFileSync(path.join(root, '.homeycompose/app.json')));
  const generatedManifest = JSON.parse(fs.readFileSync(path.join(root, 'app.json')));
  const driver = JSON.parse(fs.readFileSync(path.join(root, 'drivers/THS317-ET/driver.compose.json')));
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));

  it('keeps package and app versions synchronized', () => {
    assert.equal(packageJson.version, composeManifest.version);
    assert.equal(generatedManifest.version, composeManifest.version);
  });

  it('matches the interviewed OWON endpoint', () => {
    assert.equal(driver.zigbee.manufacturerName, 'OWON');
    assert(driver.zigbee.productId.includes('THS317-ET'));
    assert.deepEqual(driver.zigbee.endpoints['1'].clusters, [0, 1, 1026]);
    assert.deepEqual(driver.zigbee.endpoints['1'].bindings, [1, 1026]);
  });

  it('declares all capabilities used by the driver', () => {
    assert.deepEqual(driver.capabilities, [
      'alarm_battery',
      'measure_battery',
      'measure_temperature',
      'measure_voltage',
    ]);
  });
});
