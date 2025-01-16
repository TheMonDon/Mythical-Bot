import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, guild) {
  // Wait 1 second to try and solve guild somehow being undefined
  client.util.wait(1000);
  if (!guild.available) return; // Ignore unavailable guilds

  try {
    client.user.setActivity(
      `${client.settings.get('default').prefix}help | ${client.guilds.cache.size.toLocaleString()} Servers`,
    );
    client.logger.log(`Left guild: ${guild.name} (${guild.id}) with ${guild.memberCount} members`);

    await db.set(`servers.${guild.id}.leave_timestamp`, Date.now());
  } catch (error) {
    client.logger.error(`GuildDelete: ${error}`);
  }
}
