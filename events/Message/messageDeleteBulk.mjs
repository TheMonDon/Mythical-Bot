import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
import hastebin from 'hastebin';
const db = new QuickDB();

export async function run(client, messages) {
  const server = messages.first().guild;
  const chan = messages.first().channel;

  const logChan = await db.get(`servers.${server.id}.logs.channel`);
  if (!logChan) return;

  const logSys = await db.get(`servers.${server.id}.logs.logSystem.bulk-messages-deleted`);
  if (logSys !== 'enabled') return;

  const chans = (await db.get(`servers.${server.id}.logs.noLogChans`)) || [];
  if (chans.includes(chan.id)) return;

  const output = [];
  output.push(`${messages.size} messages deleted in ${chan.name}:`);
  output.push('\n');
  output.push('\n');
  messages.forEach((m) => {
    const content = [];
    if (m.content) content.push(m.content) && content.push('\n');
    if (m.embeds[0]) content.push(m.embeds[0].description) && content.push('\n');
    if (m.attachments.first()) content.push(m.attachments.map((a) => a.url) + '\n');
    const authorName = m.author.discriminator === '0' ? m.author.username : m.author.tag;
    output.push(`${authorName} (User ID: ${m.author.id} Message ID: ${m.id})\n`);
    output.push(content || 'Unable to parse message content.');
    output.push('\n');
    output.push('\n');
  });
  const text = output.join('');

  let url;

  await hastebin
    .createPaste(text, {
      raw: true,
      contentType: 'text/plain',
      server: 'https://haste.crafters-island.com',
    })
    .then(function (urlToPaste) {
      url = urlToPaste;
    })
    .catch(function (requestError) {
      client.logger.error(requestError);
    });

  const embed = new EmbedBuilder()
    .setTitle('Bulk Messages Deleted')
    .setColor('#FF0000')
    .addFields([
      { name: 'Deleted Messages', value: url },
      { name: 'Deleted Amount', value: messages.size.toLocaleString() },
      { name: 'Channel', value: `<#${chan.id}>` },
    ]);

  server.channels.cache
    .get(logChan)
    .send({ embeds: [embed] })
    .catch(() => {});

  await db.add(`servers.${server.id}.logs.bulk-messages-deleted`, 1);
  await db.add(`servers.${server.id}.logs.all`, 1);
}
