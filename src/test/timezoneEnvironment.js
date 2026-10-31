'use strict';

const NativeEnvironment = require('jest-expo/src/preset/nativeEnvironment');

const DEFAULT_TIMEZONE = 'America/Bogota';

class TimezoneEnvironment extends NativeEnvironment {
  constructor(config, context) {
    super(config, context);
    this.timezone = config.projectConfig.testEnvironmentOptions.timezone ?? DEFAULT_TIMEZONE;
  }

  async setup() {
    this.previousTimezone = process.env.TZ;
    process.env.TZ = this.timezone;
    await super.setup();
  }

  async teardown() {
    if (this.previousTimezone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = this.previousTimezone;
    }
    await super.teardown();
  }
}

module.exports = TimezoneEnvironment;
module.exports.TestEnvironment = TimezoneEnvironment;
