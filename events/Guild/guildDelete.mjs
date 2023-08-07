export async function run(client, guild) {
  if (!guild.available) return; // Ignore unavailable guilds
  // Wait 1 second to try and solve guild somehow being undefined
  client.util.wait(1000);

  try {
    client.user.setActivity(`${client.settings.get('default').prefix}help | ${client.guilds.cache.size} Servers`);
    // Well they're gone. Let's remove them from the settings and log it!
    client.settings.delete(guild.id);
    client.logger.log(`Left guild: ${guild.name} (${guild.id}) with ${guild.memberCount} members`);
  } catch (error) {
    client.logger.error(`GuildDelete: ${error}`);
  }
}
