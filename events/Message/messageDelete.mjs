import { EmbedBuilder, AuditLogEvent } from 'discord.js';

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
        const audit = await message.guild.fetchAuditLogs({
          type: AuditLogEvent.MessageDelete,
          limit: 1,
        });
        const entry = audit.entries.first();

        if (entry && entry.target.id === message.author.id && Date.now() - entry.createdTimestamp < 5000) {
          delby = entry.executor;
        } else {
          // Message was probably deleted by the author
          delby = message.author;
        }
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
    if (!message.guild) return;

    const connection = await client.db.getConnection();
    try {
      if (!message.guild) return;

      const connection = await client.db.getConnection();
      const guildId = message.guild.id;

      const [asStarboard] = await connection.execute(
        /* sql */
        `
          SELECT
            starboard_id,
            original_msg_id
          FROM
            starboard_messages
          WHERE
            starboard_msg_id = ?
          LIMIT
            1
        `,
        [message.id],
      );

      if (asStarboard.length > 0) {
        const record = asStarboard[0];

        await connection.execute(
          /* sql */
          `
            DELETE FROM starboard_messages
            WHERE
              starboard_id = ?
              AND original_msg_id = ?
          `,
          [record.starboard_id, record.original_msg_id],
        );
        return;
      }

      const [starredRows] = await connection.execute(
        /* sql */
        `
          SELECT
            sm.starboard_id,
            sm.starboard_msg_id,
            s.channel_id,
            s.link_deletes,
            s.enabled,
            s.allow_bots
          FROM
            starboard_messages sm
            JOIN starboards s ON sm.starboard_id = s.id
          WHERE
            sm.original_msg_id = ?
            AND s.server_id = ?
        `,
        [message.id, guildId],
      );

      if (starredRows.length === 0) return;

      for (const row of starredRows) {
        if (!row.enabled) continue;
        if (!row.link_deletes) continue;
        if (message.author?.bot && !row.allow_bots) continue;

        const starChannel = message.guild.channels.cache.get(row.channel_id);
        if (!starChannel) continue;

        const starMessage = await starChannel.messages.fetch(row.starboard_msg_id).catch(() => null);

        await connection.execute(
          /* sql */
          `
            DELETE FROM starboard_messages
            WHERE
              starboard_id = ?
              AND original_msg_id = ?
          `,
          [row.starboard_id, message.id],
        );

        if (starMessage) {
          await starMessage.delete().catch(() => null);
        }
      }
    } catch (error) {
      client.logger.error(error);
    } finally {
      connection.release();
    }
  };

  await loggingSystem(client, message);
  await starboardSystem(client, message);
}
