import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { Buffer } from 'node:buffer';
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

  const output = [];
  const messagesArray = Array.from(messages.values());

  messagesArray.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  messagesArray.forEach((message) => {
    const date = new Date(message.createdAt);

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const formattedDate = `[${days[date.getUTCDay()]} ${months[date.getUTCMonth()]} ${date.getUTCDate()} ${String(
      date.getUTCHours(),
    ).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:${String(date.getUTCSeconds()).padStart(
      2,
      '0',
    )} ${date.getUTCFullYear()}]`;

    const authorName = message.author.discriminator === '0' ? message.author.username : message.author.tag;
    const formattedAuthor = `(${authorName} - ${message.author.id})`;
    const formattedID = `[${message.id}]`;
    output.push(`${formattedDate} ${formattedAuthor} ${formattedID}: `);

    if (message.content) output.push(message.content + '\n');
    if (message.embeds?.length > 0) {
      const embeds = message.embeds;
      const embedsOutput = [];
      embedsOutput.push('Embeds: ');

      embeds.forEach((em) => {
        const jsonString = JSON.stringify(em.toJSON(), null, 2);
        embedsOutput.push(jsonString);
      });
      output.push(embedsOutput.join('\n') + '\n');
    }
    if (message.attachments?.size > 0) {
      const attachmentString = message.attachments.map((attachment) => `[${attachment.name}](${attachment.url})\n`);
      output.push(attachmentString.join(''));
    }
    if (message.stickers?.size > 0) {
      const stickerString = message.stickers.map((sticker) => `[${sticker.name}](${sticker.url})\n`);
      output.push(stickerString.join(''));
    }
    output.push('\n');
  });
  const text = output.join('');

  const attachment = new AttachmentBuilder(Buffer.from(text), {
    name: 'deleted_messages.txt',
    description: `Messages deleted from ${channel.name}`,
  });

  const embed = new EmbedBuilder()
    .setTitle('Bulk Messages Deleted')
    .setColor('#FF0000')
    .addFields([
      { name: 'Deleted Messages', value: `Bulk deleted messages from ${channel} are available in the attached file.` },
      { name: 'Deleted Amount', value: messages.size.toLocaleString() },
    ]);

  server.channels.cache
    .get(logChan)
    .send({ embeds: [embed], files: [attachment] })
    .catch(() => {});

  await db.add(`servers.${server.id}.logs.bulk-messages-deleted`, 1);
  await db.add(`servers.${server.id}.logs.all`, 1);
}
