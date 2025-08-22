import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, message) {
  if (!message.guild) return;
  if (!message.author) return;

  const loggingSystem = async function (client, message) {
    if (message.author?.bot) return;

    const connection = await client.db.getConnection();

    try {
      const [logRows] = await connection.execute(
        /* sql */ `
          SELECT
            channel_id,
            message_deleted,
            no_log_channels
          FROM
            log_settings
          WHERE
            server_id = ?
        `,
        [message.guild.id],
      );
      if (!logRows.length) return;

      const logChannelID = logRows[0].channel_id;
      if (!logChannelID) return;

      const logSystem = logRows[0].message_deleted;
      if (logSystem !== 1) return;

      const noLogChans = JSON.parse(logRows[0].no_log_channels || '[]');
      if (noLogChans.includes(message.channel.id)) return;

      // Check if a game is being played by message author (hangman, connect4, etc)
      const current = client.games.get(message.channel.id);
      if (current && ['connect4', 'hangman', 'wordle'].includes(current.name) && current.user === message.author.id) {
        return;
      }

      let delby;
      if (message.guild.members.me.permissions.has('ViewAuditLog')) {
        await message.guild
          .fetchAuditLogs()
          .then((audit) => {
            delby = audit.entries.first().executor;
          })
          .catch(console.error);
      }

      const embed = new EmbedBuilder()
        .setTitle('Message Deleted')
        .setColor(client.getSettings(message.guild).embedErrorColor)
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
        .setThumbnail(message.author.displayAvatarURL())
        .addFields([
          { name: 'Channel', value: `<#${message.channel.id}>` },
          { name: 'Message Author', value: `${message.author} (${message.author.tag})` },
        ])
        .setFooter({ text: `Message ID: ${message.id}` })
        .setTimestamp();

      if (message.content) {
        embed.setDescription(`**Content:**\n${message.content}`);
      }

      if (message.attachments?.size > 0) {
        const attachmentString = message.attachments.map((attachment) => `[${attachment.name}](${attachment.url})\n`);
        embed.addFields([{ name: 'Attachments', value: attachmentString.join('').slice(0, 1_024) }]);
      }

      if (message.stickers?.size > 0) {
        const stickerString = message.stickers.map((sticker) => `[${sticker.name}](${sticker.url})\n`);
        embed.addFields([{ name: 'Stickers', value: stickerString.join('').slice(0, 1_024) }]);
      }

      if (delby && message.author !== delby) {
        embed.addFields([{ name: 'Deleted By', value: delby.toString() }]);
      }

      if (message.mentions.users.size >= 1) {
        embed.addFields([{ name: 'Mentioned Users', value: `${[...message.mentions.users.values()]}` }]);
      }

      let logChannel = message.guild.channels.cache.get(logChannelID);
      if (!logChannel) {
        logChannel = await message.guild.channels.fetch(logChannelID);
      }

      if (!logChannel) return;

      return logChannel.send({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      client.logger.error(error);
    } finally {
      connection.release();
    }
  };

  const starboardSystem = async function (client, message) {
    const starboards = (await db.get(`servers.${message.guild.id}.starboards`)) || {};

    for (const [name, config] of Object.entries(starboards)) {
      if (!config.enabled) continue;
      if (!config['link-deletes']) continue;
      if (message.author.bot && !config['allow-bots']) continue;

      const starChannel = message.guild.channels.cache.get(config.channelId);
      if (!starChannel) continue;

      const existingStarMsg = await db.get(
        `servers.${message.guild.id}.starboards.${name}.messages.${message.id}.starboardMsgId`,
      );
      if (!existingStarMsg) continue;

      const starMessage = await starChannel.messages.fetch(existingStarMsg).catch(() => null);
      if (starMessage) {
        await db.delete(`servers.${message.guild.id}.starboards.${name}.messages.${message.id}`);
        await starMessage.delete();
      }
    }
  };

  await loggingSystem(client, message);
  await starboardSystem(client, message);
}
