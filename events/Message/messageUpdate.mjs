/* eslint-disable prefer-regex-literals */
import { EmbedBuilder } from 'discord.js';

export async function run(client, oldMessage, newMessage) {
  async function LogSystem(client, oldMessage, newMessage) {
    if (oldMessage.author?.bot) return;
    if (!newMessage.guild) return;
    if (!oldMessage.author) return;
    if (oldMessage.content === newMessage.content) return;

    const connection = await client.db.getConnection();

    try {
      const [logRows] = await connection.execute(
        /* sql */ `
          SELECT
            channel_id,
            message_updated,
            no_log_channels
          FROM
            log_settings
          WHERE
            server_id = ?
        `,
        [newMessage.guild.id],
      );
      if (!logRows.length) return;

      const logChannelID = logRows[0].channel_id;
      if (!logChannelID) return;

      const logSystem = logRows[0].message_updated;
      if (logSystem !== 1) return;

      const noLogChans = JSON.parse(logRows[0].no_log_channels || '[]');
      if (noLogChans.includes(newMessage.channel.id)) return;

      let oldContent = ' ';
      let newContent = ' ';

      if (oldMessage.content) {
        oldContent =
          oldMessage.content.length <= 1024 ? oldMessage.content : `${oldMessage.content.substring(0, 1020)}...`;
      }
      if (newMessage.content) {
        newContent =
          newMessage.content.length <= 1024 ? newMessage.content : `${newMessage.content.substring(0, 1020)}...`;
      }

      const embed = new EmbedBuilder()
        .setTitle('Message Updated')
        .setURL(newMessage.url)
        .setAuthor({ name: oldMessage.author.tag, iconURL: oldMessage.author.displayAvatarURL() })
        .setColor('#EE82EE')
        .setThumbnail(oldMessage.author.displayAvatarURL())
        .addFields([
          {
            name: 'Original Message',
            value: oldContent,
          },
          {
            name: 'Edited Message',
            value: newContent,
          },
          { name: 'Channel', value: oldMessage.channel.toString(), inline: true },
          { name: 'Message Author', value: `${oldMessage.author} (${oldMessage.author.tag})` },
        ])
        .setTimestamp();

      if (newMessage.mentions.users.size !== 0 || newMessage.mentions.users.size !== oldMessage.mentions.users.size) {
        if (newMessage.mentions.users.size !== oldMessage.mentions.users.size) {
          embed.addFields([
            {
              name: 'Old Mentioned Users',
              value: `Mentioned Users Count: ${[...oldMessage.mentions.users.values()].length} \nMentioned Users List: ${[
                ...oldMessage.mentions.users.values(),
              ]}`,
            },
            {
              name: 'New Mentioned Users',
              value: `Mentioned Users Count: ${[...newMessage.mentions.users.values()].length} \nMentioned Users List: ${[
                ...newMessage.mentions.users.values(),
              ]}`,
            },
          ]);
        } else if (newMessage.mentions.users.size !== 0) {
          embed.addFields([
            {
              name: 'Mentioned Users',
              value: `Mentioned Users Count: ${[...newMessage.mentions.users.values()].length} \nMentioned Users List: ${[
                ...newMessage.mentions.users.values(),
              ]}`,
            },
          ]);
        }
      }

      let logChannel = newMessage.guild.channels.cache.get(logChannelID);
      if (!logChannel) {
        logChannel = await newMessage.guild.channels.fetch(logChannelID);
      }

      if (!logChannel) return;

      return logChannel.send({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      client.logger.error(error);
    } finally {
      connection.release();
    }
  }

  async function CommandUpdate(client, oldMessage, newMessage) {
    if (oldMessage.author?.bot) return;
    let bool = true;
    const re = /'http'/;

    if (re.test(newMessage.content)) return;
    // Return if content didn’t change
    if (oldMessage.content === newMessage.content) return;

    // Also return if this is just a pin/unpin update
    if (oldMessage.pinned !== newMessage.pinned) return;

    // Also return if embeds/attachments changed but content didn’t
    if (oldMessage.embeds.length !== newMessage.embeds.length) return;
    if (oldMessage.attachments.size !== newMessage.attachments.size) return;
    if (newMessage.guild && !newMessage.channel.permissionsFor(newMessage.guild.members.me).missing('SendMessages')) {
      return;
    }
    if (newMessage.guild && newMessage.guild.members.me.isCommunicationDisabled()) return;

    const connection = await client.db.getConnection();

    try {
      const settings = client.getSettings(newMessage.guild);
      newMessage.settings = settings;
      let tag = settings.prefix;

      const prefixMention = new RegExp(`^(<@!?${client.user.id}>)(\\s+)?`);
      if (newMessage.guild && newMessage.content.match(prefixMention)) {
        tag = String(newMessage.guild.members.me);
      } else if (newMessage.content.indexOf(settings.prefix) !== 0) {
        bool = false;
        return;
      }

      if (!bool) return;

      const args = newMessage.content.slice(tag.length).trim().split(/\s+/g);
      const command = args.shift().toLowerCase();
      if (!command && tag === String(newMessage.guild?.members.me)) {
        if (!args || args.length < 1) {
          return newMessage.channel.send(`The current prefix is: ${newMessage.settings.prefix}`);
        }
      }

      // If the member on a guild is invisible or not cached, fetch them.
      if (newMessage.guild && !newMessage.member) {
        await newMessage.guild.members.fetch(newMessage.author.id);
      }
      // Get the user or member's permission level from the elevation
      const level = await client.permlevel(newMessage);

      let isAlias = false;
      let aliasName = null;
      let cmd = client.commands.get(command);
      if (!cmd) {
        cmd = client.commands.get(client.aliases.get(command));
        aliasName = command;
        isAlias = !!client.aliases.get(command);
      }

      if (!cmd) return;

      // Check if the member is blacklisted from using commands in this guild.
      if (newMessage.guild) {
        const [blacklistRows] = await connection.execute(
          `SELECT * FROM server_blacklists WHERE server_id = ? AND user_id = ?`,
          [newMessage.guild.id, newMessage.author.id],
        );

        const blacklisted = blacklistRows[0]?.blacklisted;
        const reason = blacklistRows[0]?.reason || 'No reason provided';

        if (
          blacklisted &&
          level < 4 &&
          (command.help.name !== 'blacklist' || command.help.name !== 'global-blacklist')
        ) {
          const embed = new EmbedBuilder()
            .setTitle('Server Blacklisted')
            .setAuthor({ name: newMessage.author.tag, iconURL: newMessage.author.displayAvatarURL() })
            .setColor(newMessage.settings.embedErrorColor)
            .setDescription(
              `Sorry ${newMessage.author.username}, you are currently blacklisted from using commands in this server.`,
            )
            .addFields([{ name: 'Reason', value: reason, inline: false }]);

          return newMessage.channel.send({ embeds: [embed] });
        }
      }

      const [gblacklistRows] = await connection.execute(
        /* sql */ `
          SELECT
            *
          FROM
            global_blacklists
          WHERE
            user_id = ?
        `,
        [newMessage.author.id],
      );
      const globalBlacklisted = gblacklistRows[0]?.blacklisted;

      if (globalBlacklisted && level < 8 && (cmd.help.name !== 'blacklist' || cmd.help.name !== 'global-blacklist')) {
        const blacklistReason = gblacklistRows[0]?.reason || 'No reason provided';
        const embed = new EmbedBuilder()
          .setTitle('Global Blacklisted')
          .setAuthor({ name: newMessage.author.tag, iconURL: newMessage.author.displayAvatarURL() })
          .setColor(newMessage.settings.embedErrorColor)
          .setDescription(`Sorry ${newMessage.author.username}, you are currently blacklisted from using commands.`)
          .addFields([{ name: 'Reason', value: blacklistReason, inline: false }]);

        return newMessage.channel.send({ embeds: [embed] });
      }

      // Some commands may not be useable in DMs. This check prevents those commands from running
      // and return a friendly error message.
      if (!newMessage.guild && cmd.conf.guildOnly) {
        return newMessage.channel.send(
          'This command is unavailable via private message. Please run this command in a guild.',
        );
      }

      if (level < client.levelCache[cmd.conf.permLevel]) {
        if (settings.systemNotice === 'true') {
          const embed = new EmbedBuilder()
            .setTitle('Missing Permission')
            .setAuthor({ name: newMessage.author.tag, iconURL: newMessage.author.displayAvatarURL() })
            .setColor(newMessage.settings.embedErrorColor)
            .addFields([
              {
                name: 'Your Level',
                value: `${level} (${client.permLevels.find((l) => l.level === level).name})`,
                inline: true,
              },
              {
                name: 'Required Level',
                value: `${client.levelCache[cmd.conf.permLevel]} (${cmd.conf.permLevel})`,
                inline: true,
              },
            ]);

          return newMessage.channel.send({ embeds: [embed] });
        } else {
          return;
        }
      }
      newMessage.author.permLevel = level;

      if (cmd.conf.requiredArgs > args.length) {
        const embed = new EmbedBuilder()
          .setAuthor({ name: newMessage.author.username, iconURL: newMessage.author.displayAvatarURL() })
          .setColor(newMessage.settings.embedErrorColor)
          .setTitle('Missing Command Arguments')
          .setFooter({ text: '[] = optional, <> = required' })
          .addFields([
            { name: 'Incorrect Usage', value: newMessage.settings.prefix + cmd.help.usage },
            { name: 'Examples', value: cmd.help.examples?.join('\n') || 'None' },
          ]);

        return newMessage.channel.send({ embeds: [embed] });
      }

      // If the command exists, **AND** the user has permission, run it.
      await cmd.run(newMessage, args, level);

      const isText = true;
      const isSlash = false;

      await connection.query('CALL updateCommandStats(?, ?, ?, ?, ?)', [
        command.help.name,
        isText ? 1 : 0,
        isSlash ? 1 : 0,
        isAlias ? 1 : 0,
        aliasName || null,
      ]);
    } catch (error) {
      client.logger.error(error);
    } finally {
      connection.release();
    }
  }

  async function StarMessageUpdate(client, oldMessage, newMessage) {
    if (!newMessage.guild) return;
    if (!oldMessage.author) return;

    const connection = await client.db.getConnection();

    try {
      if (newMessage.partial) await newMessage.fetch(); // Ensure we have full message data

      const [starboards] = await connection.query(
        /* sql */ `
          SELECT
            *
          FROM
            starboards
          WHERE
            server_id = ?
        `,
        [newMessage.guild.id],
      );
      const [overrides] = await connection.query(
        /* sql */
        `
          SELECT
            o.*,
            s.name AS starboard_name
          FROM
            starboard_overrides o
            JOIN starboards s ON s.id = o.starboard_id
          WHERE
            s.server_id = ?
        `,
        [newMessage.guild.id],
      );

      function getStarboardConfig(starboardName, channelID) {
        const base = starboards.find((s) => s.name === starboardName);
        if (!base) return null;

        const override = overrides.find(
          (o) => o.starboard_name === starboardName && JSON.parse(o.channels || '[]').includes(channelID),
        );

        if (!override) return base;

        // Merge: override fields that are not null
        const merged = { ...base };
        for (const key in override) {
          if (override[key] !== null && key !== 'channels' && key !== 'starboard_name') {
            merged[key] = override[key];
          }
        }

        return merged;
      }

      for (const sb of starboards) {
        const config = getStarboardConfig(sb.name, newMessage.channel.id);
        // Now you can use `config`, which will either be the default starboard config or an overridden one

        if (!config.enabled) continue;
        if (!config.link_edits) continue;
        if (newMessage.author.bot && !config.allow_bots) continue;

        const starChannel = newMessage.guild.channels.cache.get(config.channel_id);
        if (!starChannel) continue;
        if (!starChannel.permissionsFor(newMessage.guild.members.me).has(['SendMessages', 'ViewChannel'])) continue;

        if (starChannel === newMessage.channel) continue;

        // Fetch existing starboard message ID (if any)
        const [rows] = await connection.query(
          /* sql */
          `
            SELECT
              starboard_msg_id
            FROM
              starboard_messages
            WHERE
              starboard_id = ?
              AND original_msg_id = ?
          `,
          [sb.id, newMessage.id],
        );

        const existingStarMsgId = rows.length ? rows[0].starboard_msg_id : null;
        if (!existingStarMsgId) continue;

        const starMessage = await starChannel.messages.fetch(existingStarMsgId).catch(() => null);
        if (!starMessage) continue;
        const existingFooter = starMessage.embeds[0].footer.text;

        const embeds = [];
        const settings = client.getSettings(newMessage.guild);

        // Function to process attachments
        const processAttachments = (attachments, embed, embedsArray) => {
          const attachmentMessage = [];

          if (attachments.length > 0 && attachments[0].contentType?.startsWith('image')) {
            embed.setImage(attachments[0].url);
          }

          for (const attachment of attachments.slice(1)) {
            if (attachment.contentType?.startsWith('image')) {
              const attachmentEmbed = new EmbedBuilder()
                .setImage(attachment.url)
                .setColor(config.color || settings.embedColor);
              embedsArray.push(attachmentEmbed);
            } else {
              attachmentMessage.push(`[${attachment.name}](${attachment.url})`);
            }
          }

          if (attachmentMessage.length > 0) {
            embed.addFields([{ name: 'Attachments', value: attachmentMessage.join('\n'), inline: true }]);
          }
        };

        // If replied-to is enabled and the message has a reference
        let replyEmbed;
        if (config.replied_to && newMessage.reference) {
          const replyMessage = await newMessage.channel.messages
            .fetch(newMessage.reference.messageId)
            .catch(() => null);

          if (replyMessage) {
            const replyAttachments = [...replyMessage.attachments.values()];
            replyEmbed = new EmbedBuilder()
              .setAuthor({
                name: `Replying to ${replyMessage.author.tag}`,
                iconURL: replyMessage.author.displayAvatarURL(),
              })
              .setThumbnail(replyMessage.author.displayAvatarURL())
              .setDescription(replyMessage.content || null)
              .setURL(replyMessage.url)
              .addFields([
                { name: 'Author', value: replyMessage.author.toString(), inline: true },
                { name: 'Channel', value: `<#${replyMessage.channel.id}>`, inline: true },
                { name: 'Message', value: `[Jump To](${replyMessage.url})`, inline: true },
              ])
              .setColor(config.color || settings.embedColor)
              .setFooter({ text: replyMessage.id.toString() })
              .setTimestamp();

            processAttachments(replyAttachments, replyEmbed, embeds);
            embeds.unshift(replyEmbed);
          }
        }

        // Process the main message
        const attachments = [...newMessage.attachments.values()];
        const embed = new EmbedBuilder()
          .setAuthor({ name: newMessage.author.tag, iconURL: newMessage.author.displayAvatarURL() })
          .setThumbnail(newMessage.author.displayAvatarURL())
          .setDescription(newMessage.content || null)
          .setURL(newMessage.url)
          .addFields([
            { name: 'Author', value: newMessage.author.toString(), inline: true },
            { name: 'Channel', value: `<#${newMessage.channel.id}>`, inline: true },
            { name: 'Message', value: `[Jump To](${newMessage.url})`, inline: true },
          ])
          .setColor(config.color || settings.embedColor)
          .setFooter({ text: existingFooter })
          .setTimestamp();

        processAttachments(attachments, embed, embeds);
        embeds.unshift(embed);
        if (replyEmbed) {
          embeds.unshift(replyEmbed);
        }

        // Add any existing message embeds AFTER the original embed
        if (newMessage.embeds?.length > 0) {
          if (config.extra_embeds) {
            newMessage.embeds.forEach((msgEmbed) => embeds.push(EmbedBuilder.from(msgEmbed)));
          }
        }

        const content = config.ping_author ? `<@${newMessage.author.id}>` : null;

        await starMessage.edit({ content, embeds });
      }
    } catch (error) {
      client.logger.error(error);
    } finally {
      connection.release();
    }
  }

  await LogSystem(client, oldMessage, newMessage);
  await CommandUpdate(client, oldMessage, newMessage);
  await StarMessageUpdate(client, oldMessage, newMessage);
}
