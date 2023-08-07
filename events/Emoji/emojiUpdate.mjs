import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, oldEmoji, newEmoji) {
  if (oldEmoji.name === newEmoji.name && oldEmoji.identifier === newEmoji.identifier) return;

  const logChan = await db.get(`servers.${oldEmoji.guild.id}.logs.channel`);
  if (!logChan) return;

  const logSys = await db.get(`servers.${oldEmoji.guild.id}.logs.logSystem.emoji`);
  if (logSys !== 'enabled') return;

  const embed = new EmbedBuilder()
    .setTitle('Emoji Updated')
    .setColor(client.getSettings(oldEmoji.guild).embedSuccessColor)
    .setThumbnail(oldEmoji.url)
    .setTimestamp()
    .addFields([
      { name: 'Emoji ID', value: oldEmoji.id, inline: true },
      { name: 'Is Animated?', value: oldEmoji.animated ? 'True' : 'False', inline: true },
    ]);

  if (oldEmoji.name !== newEmoji.name)
    embed.addFields([
      { name: 'Old Name', value: oldEmoji.name, inline: true },
      { name: 'New Name', value: newEmoji.name, inline: true },
    ]);

  if (oldEmoji.identifier !== newEmoji.identifier)
    embed.addFields([
      { name: 'Old Identifier', value: oldEmoji.identifier, inline: true },
      { name: 'New Identifier', value: newEmoji.identifier, inline: true },
    ]);

  oldEmoji.guild.channels.cache
    .get(logChan)
    .send({ embeds: [embed] })
    .catch(() => {});

  await db.add(`servers.${oldEmoji.guild.id}.logs.emoji`, 1);
  await db.add(`servers.${oldEmoji.guild.id}.logs.all`, 1);
}
