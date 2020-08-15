// This event executes when a new guild (server) is joined.

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run (guild) {

    this.client.user.setActivity(`${this.client.settings.get("default").prefix}help | ${this.client.guilds.cache.size} Servers`);
    this.client.logger.log(`New guild has been joined: ${guild.name} (${guild.id}) with ${guild.memberCount - 1} members`);
  }
};
