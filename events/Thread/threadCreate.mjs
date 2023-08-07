import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, thread) {
  if (thread.joinable) await thread.join();

  const logChan = await db.get(`servers.${thread.guild.id}.logs.channel`);
  if (!logChan) return;

  const logSys = await db.get(`servers.${thread.guild.id}.logs.logSystem.thread-created`);
  if (logSys !== 'enabled') return;

  const chans = (await db.get(`servers.${thread.guild.id}.logs.noLogChans`)) || [];
  if (chans.includes(thread.id)) return;

  const embed = new EmbedBuilder()
    .setTitle('Thread Channel Created')
    .setColor(client.getSettings(thread.guild).embedSuccessColor)
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

  await db.add(`servers.${thread.guild.id}.logs.thread-created`, 1);
  await db.add(`servers.${thread.guild.id}.logs.all`, 1);
}
