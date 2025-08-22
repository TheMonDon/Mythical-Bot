import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { Buffer } from 'node:buffer';

export async function run(client, messages) {
  const server = messages.first().guild;
  const channel = messages.first().channel;

  const connection = await client.db.getConnection();

  try {
    const [logRows] = await connection.execute(
      /* sql */ `
        SELECT
          channel_id,
          bulk_messages_deleted,
          no_log_channels
        FROM
          log_settings
        WHERE
          server_id = ?
      `,
      [channel.guild.id],
    );
    if (!logRows.length) return;

    const logChannelID = logRows[0].channel_id;
    if (!logChannelID) return;

    const logSystem = logRows[0].bulk_messages_deleted;
    if (logSystem !== 1) return;

    const noLogChans = JSON.parse(logRows[0].no_log_channels || '[]');
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

      const formattedAuthor = `(${message.author?.tag} - ${message.author?.id})`;
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
      .setColor(client.getSettings(server).embedErrorColor)
      .addFields([
        {
          name: 'Deleted Messages',
          value: `Bulk deleted messages from ${channel} are available in the attached file.`,
        },
        { name: 'Deleted Amount', value: messages.size.toLocaleString() },
      ]);

    let logChannel = server.channels.cache.get(logChannelID);
    if (!logChannel) {
      logChannel = await server.channels.fetch(logChannelID);
    }

    if (!logChannel) return;

    return logChannel.send({ embeds: [embed], files: [attachment] }).catch(() => {});
  } catch (error) {
    client.logger.error(error);
  } finally {
    connection.release();
  }
}
