import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, thread) {
  const logChan = await db.get(`servers.${thread.guild.id}.logs.channel`);
  if (!logChan) return;

  const logSys = await db.get(`servers.${thread.guild.id}.logs.logSystem.thread-deleted`);
  if (logSys !== 'enabled') return;

  const noLogChans = (await db.get(`servers.${thread.guild.id}.logs.noLogChans`)) || [];
  if (noLogChans.includes(thread.id)) return;

  const embed = new EmbedBuilder()
    .setTitle('Thread Channel Deleted')
    .setColor(client.getSettings(thread.guild).embedErrorColor)
    .addFields([
      { name: 'Name', value: thread.name },
      { name: 'Category', value: thread.parent?.name || 'None' },
    ])
    .setFooter({ text: `ID: ${thread.id}` })
    .setTimestamp();

  thread.guild.channels.cache
    .get(logChan)
    .send({ embeds: [embed] })
    .catch(() => {});

  await db.add(`servers.${thread.guild.id}.logs.thread-deleted`, 1);
  await db.add(`servers.${thread.guild.id}.logs.all`, 1);
}
