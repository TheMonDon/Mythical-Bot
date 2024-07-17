import { generateFromMessages } from 'discord-html-transcripts';
import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, messages) {
  const server = messages.first().guild;
  const channel = messages.first().channel;

  const logChan = await db.get(`servers.${server.id}.logs.channel`);
  if (!logChan) return;

  const logSys = await db.get(`servers.${server.id}.logs.logSystem.bulk-messages-deleted`);
  if (logSys !== 'enabled') return;

  const noLogChans = (await db.get(`servers.${server.id}.logs.noLogChans`)) || [];
  if (noLogChans.includes(channel.id)) return;

  // Filter out messages with no author
  const filteredMessages = messages.filter((message) => message.author);

  const attachment = await generateFromMessages(filteredMessages, channel);
  const embed = new EmbedBuilder()
    .setTitle('Bulk Messages Deleted')
    .setColor('#FF0000')
    .addFields([
      { name: 'Deleted Messages', value: `Bulk deleted messages from ${channel} are available in the attached file.` },
      { name: 'Deleted Amount', value: filteredMessages.size.toLocaleString() },
    ]);

  return server.channels.cache
    .get(logChan)
    .send({ embeds: [embed], files: [attachment] })
    .catch(() => {});
}
