export async function run(client, guild) {
  // Wait 1 second to try and solve guild somehow being undefined
  client.util.wait(1000);

  try {
    client.user.setActivity(`${client.settings.get('default').prefix}help | ${client.guilds.cache.size} Servers`);
    client.logger.log(`New guild has been joined: ${guild.name} (${guild.id}) with ${guild.memberCount - 1} members`);
  } catch (error) {
    client.logger.error(`GuildCreate: ${error}`);
  }
}
