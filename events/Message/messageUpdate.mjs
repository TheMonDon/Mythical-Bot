/* eslint-disable prefer-regex-literals */
import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, oldMessage, newMessage) {
  async function LogSystem(client, oldMessage, newMessage) {
    if (oldMessage.author?.bot) return;
    if (!newMessage.guild) return;
    if (!oldMessage.author) return;

    const logChan = await db.get(`servers.${newMessage.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = await db.get(`servers.${newMessage.guild.id}.logs.logSystem.message-edited`);
    if (!logSys || logSys !== 'enabled') return;

    const noLogChans = (await db.get(`servers.${newMessage.guild.id}.logs.noLogChans`)) || [];
    if (noLogChans.includes(newMessage.channel.id)) return;

    const logChannel = newMessage.guild.channels.cache.get(logChan);
    if (!logChannel.permissionsFor(client.user.id).has('SendMessages')) return;
    if (oldMessage.content === newMessage.content) return;

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
      .setTitle('Message Edited')
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

    return newMessage.guild.channels.cache
      .get(logChan)
      .send({ embeds: [embed] })
      .catch(() => {});
  }

  async function CommandUpdate(client, oldMessage, newMessage) {
    if (oldMessage.author?.bot) return;
    let bool = true;
    const re = /'http'/;

    if (re.test(newMessage.content)) return;
    if (oldMessage.content === newMessage.content || oldMessage === newMessage) return;
    if (newMessage.guild && !newMessage.channel.permissionsFor(newMessage.guild.members.me).missing('SendMessages'))
      return;
    if (newMessage.guild && newMessage.guild.members.me.isCommunicationDisabled()) return;

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
      if (!args || args.length < 1)
        return newMessage.channel.send(`The current prefix is: ${newMessage.settings.prefix}`);
    }

    // If the member on a guild is invisible or not cached, fetch them.
    if (newMessage.guild && !newMessage.member) {
      await newMessage.guild.members.fetch(newMessage.author.id);
    }
    // Get the user or member's permission level from the elevation
    const level = client.permlevel(newMessage);

    const cmd = client.commands.get(command) || client.commands.get(client.aliases.get(command));
    if (!cmd) return;

    // Check if the member is blacklisted from using commands in this guild.
    if (newMessage.guild) {
      const blacklist = await db.get(`servers.${newMessage.guild.id}.users.${newMessage.member.id}.blacklist`);
      if (blacklist && level < 4 && (cmd.help.name !== 'blacklist' || cmd.help.name !== 'global-blacklist')) {
        return newMessage.channel.send(
          `Sorry ${newMessage.member.displayName}, you are currently blacklisted from using commands in this server.`,
        );
      }
    }

    const globalBlacklisted = await db.get(`users.${newMessage.author.id}.blacklist`);
    if (globalBlacklisted && level < 8 && (cmd.help.name !== 'blacklist' || cmd.help.name !== 'global-blacklist')) {
      return newMessage.channel.send(
        `Sorry ${newMessage.author.username}, you are currently blacklisted from using commands.`,
      );
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
              value: `${level} (${client.config.permLevels.find((l) => l.level === level).name})`,
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
    await db.add('global.commands', 1);
    cmd.run(newMessage, args, level);
  }

  async function StarMessageUpdate(client, oldMessage, newMessage) {
    if (!newMessage.guild) return;
    if (!oldMessage.author) return;
    if (newMessage.partial) await newMessage.fetch(); // Ensure we have full message data

    const starboards = (await db.get(`servers.${oldMessage.guild.id}.starboards`)) || {};

    for (const [name, config] of Object.entries(starboards)) {
      if (!config.enabled) continue;
      if (!config['link-edits']) continue;
      if (oldMessage.author.bot && !config['allow-bots']) continue;

      const starChannel = newMessage.guild.channels.cache.get(config.channelId);
      if (!starChannel) continue;
      if (!starChannel.permissionsFor(newMessage.guild.members.me).has(['SendMessages', 'ViewChannel'])) continue;

      if (starChannel === newMessage.channel) continue;

      const existingStarMsg = await db.get(
        `servers.${newMessage.guild.id}.starboards.${name}.messages.${newMessage.id}`,
      );
      if (!existingStarMsg) continue;

      // Get the configured emoji
      const isCustomEmoji = config.emoji.startsWith('<') && config.emoji.endsWith('>');
      let emojiIdentifier;

      if (isCustomEmoji) {
        emojiIdentifier = config.emoji.split(':')[2].slice(0, -1); // Extract emoji ID
      } else {
        emojiIdentifier = config.emoji; // Unicode emoji
      }

      // Find the reaction matching the configured emoji
      const reaction = newMessage.reactions.cache.find((r) =>
        isCustomEmoji ? r.emoji.id === emojiIdentifier : r.emoji.name === emojiIdentifier,
      );

      const emojiCount = reaction ? reaction.count : 0; // Get total count or default to 0

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
      if (config['replied-to'] && newMessage.reference) {
        const replyMessage = await newMessage.channel.messages.fetch(newMessage.reference.messageId).catch(() => null);

        if (replyMessage) {
          const replyAttachments = [...replyMessage.attachments.values()];
          const replyEmbed = new EmbedBuilder()
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
        .setFooter({ text: `${config.emoji} ${emojiCount} | ${newMessage.id}` })
        .setTimestamp();

      processAttachments(attachments, embed, embeds);
      embeds.unshift(embed);

      // Add any existing message embeds AFTER the original embed
      if (newMessage.embeds.length > 0) {
        newMessage.embeds.forEach((msgEmbed) => embeds.push(EmbedBuilder.from(msgEmbed)));
      }

      let content = null;
      if (config['ping-author'] === true) {
        content = `<@${newMessage.author.id}>`;
      }

      const starMessage = await starChannel.messages.fetch(existingStarMsg).catch(() => null);
      if (starMessage) {
        await starMessage.edit({ content, embeds });
      }
    }
  }

  await LogSystem(client, oldMessage, newMessage);
  await CommandUpdate(client, oldMessage, newMessage);
  await StarMessageUpdate(client, oldMessage, newMessage);
}
