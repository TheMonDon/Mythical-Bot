module.exports = class {
  constructor(client) {
    this.client = client;
  }

  async run(guild) {
    // Wait 1 second to try and solve guild somehow being undefined
    this.client.util.wait(1000);

    try {
      this.client.user.setActivity(
        `${this.client.settings.get('default').prefix}help | ${this.client.guilds.cache.size} Servers`,
      );
      this.client.logger.log(
        `New guild has been joined: ${guild.name} (${guild.id}) with ${guild.memberCount - 1} members`,
      );
    } catch (error) {
      this.client.logger.error(`GuildCreate: ${error}`);
    }
  }
};
