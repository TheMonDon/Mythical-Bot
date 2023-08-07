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
    .setTitle('Sticker Deleted')
    .setColor(client.getSettings(guild).embedErrorColor)
    .setThumbnail(sticker.url)
    .addFields([
      { name: 'Name', value: sticker.name },
      { name: 'Sticker ID', value: sticker.id },
      { name: 'Description', value: sticker.description },
      { name: 'Tags', value: sticker.tags },
    ])
    .setTimestamp();

  guild.channels.cache
    .get(logChan)
    .send({ embeds: [embed] })
    .catch(() => {});

  await db.add(`servers.${guild.id}.logs.sticker`, 1);
  await db.add(`servers.${guild.id}.logs.all`, 1);
}
