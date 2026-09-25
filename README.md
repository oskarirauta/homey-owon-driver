# OWON for Homey

Homey app for OWON Zigbee devices (non-Tuya variants).

## Supported devices

- OWON THS317-ET temperature sensor with external probe

The THS317-ET exposes one Zigbee Temperature Measurement cluster. Homey therefore receives one temperature value: the external probe measurement. OWON's current datasheet describes THS317 and THS317-ET as separate models: THS317 uses its built-in temperature/humidity sensor, while THS317-ET includes the external probe. Although the product family has both sensing methods, this THS317-ET firmware does not expose the built-in value as a second Zigbee endpoint or attribute. A `measure_temperature.external` capability and quick-view selector can only be added if a firmware variant is observed transmitting a distinct second value.

## Development

Requirements: Node.js 22 or newer (CI uses Node.js 24).

```sh
npm ci
npm test
npm run validate:publish
npm run validate:verified
```

`app.json` is generated from `.homeycompose/app.json` and the driver compose files by `homey app build`.

## Workflows

- `validate.yml` installs locked dependencies, runs lint/tests, and validates both `publish` and `verified` levels.
- `update-version.yml` updates the Homey and npm package versions, rebuilds the manifest, validates, commits, tags, and creates a GitHub release.
- `publish.yml` validates before publishing and requires the repository secret `HOMEY_PAT`.
