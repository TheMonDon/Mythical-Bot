module.exports = class {
  constructor(client) {
    this.client = client;
  }

  async run(guild) {
    if (!guild.available) return; // Ignore unavailable guilds
    // Wait 1 second to try and solve guild somehow being undefined
    this.client.util.wait(1000);

    try {
      this.client.user.setActivity(
        `${this.client.settings.get('default').prefix}help | ${this.client.guilds.cache.size} Servers`,
      );
      // Well they're gone. Let's remove them from the settings and log it!
      this.client.settings.delete(guild.id);
      this.client.logger.log(`Left guild: ${guild.name} (${guild.id}) with ${guild.memberCount} members`);
    } catch (error) {
      this.client.logger.error(`GuildDelete: ${error}`);
    }
  }
};
