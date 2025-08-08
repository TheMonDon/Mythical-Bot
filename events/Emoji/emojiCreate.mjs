import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, emoji) {
  const logChan = await db.get(`servers.${emoji.guild.id}.logs.channel`);
  if (!logChan) return;

  const logSys = await db.get(`servers.${emoji.guild.id}.logs.logSystem.emoji`);
  if (logSys !== 'enabled') return;

  const embed = new EmbedBuilder()
    .setTitle('Emoji Created')
    .setColor(client.getSettings(emoji.guild).embedSuccessColor)
    .setThumbnail(emoji.imageURL())
    .addFields([
      { name: 'Name', value: emoji.name },
      { name: 'Identifier', value: emoji.identifier },
      { name: 'Emoji ID', value: emoji.id },
      { name: 'Is Animated?', value: emoji.animated ? 'True' : 'False' },
    ])
    .setTimestamp();

  emoji.guild.channels.cache
    .get(logChan)
    .send({ embeds: [embed] })
    .catch(() => {});
}
