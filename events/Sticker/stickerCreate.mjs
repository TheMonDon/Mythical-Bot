import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, sticker) {
  const guild = client.guilds.cache.get(sticker.guildId);

  const logChan = await db.get(`servers.${guild.id}.logs.channel`);
  if (!logChan) return;

  const logSys = await db.get(`servers.${guild.id}.logs.logSystem.sticker`);
  if (logSys !== 'enabled') return;

  const embed = new EmbedBuilder()
    .setTitle('Sticker Created')
    .setColor(client.getSettings(guild).embedSuccessColor)
    .setThumbnail(sticker.url)
    .addFields([
      { name: 'Name', value: sticker.name },
      { name: 'Sticker ID', value: sticker.id },
      { name: 'Description', value: sticker.description || 'None provided' },
      { name: 'Tags', value: sticker.tags },
    ])
    .setTimestamp();

  return guild.channels.cache
    .get(logChan)
    .send({ embeds: [embed] })
    .catch(() => {});
}
