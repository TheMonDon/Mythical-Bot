import { ChannelType, EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, messageReaction, user) {
  if (user?.bot) return;
  if (!messageReaction) return;
  const msg = messageReaction.message;

  const starboardSystem = async function (msg) {
    const starboards = (await db.get(`servers.${msg.guild.id}.starboards`)) || {};

    for (const [name, config] of Object.entries(starboards)) {
      if (!config.enabled) continue;
      if (msg.author.bot && !config['allow-bots']) continue;

      const isCustomEmoji = config.emoji.startsWith('<') && config.emoji.endsWith('>');
      let isStarboardReaction = false;

      if (isCustomEmoji) {
        const emojiId = config.emoji.split(':')[2].slice(0, -1);
        isStarboardReaction = messageReaction.emoji.id === emojiId;
      } else {
        isStarboardReaction = messageReaction.emoji.name === config.emoji;
      }

      if (isStarboardReaction) {
        const starChannel = msg.guild.channels.cache.get(config.channelId);
        if (!starChannel) continue;
        if (!starChannel.permissionsFor(msg.guild.members.me).has(['SendMessages', 'ViewChannel'])) continue;

        if (starChannel === msg.channel) continue;

        if (!config['self-vote'] && msg.author.id === user.id) {
          if (config['remove-invalid-reactions']) {
            await messageReaction.remove();
            continue;
          }
          continue;
        }

        const stars = messageReaction.count;
        const existingStarMsg = await db.get(`servers.${msg.guild.id}.starboards.${name}.messages.${msg.id}`);

        if (stars >= config.threshold) {
          const embeds = [];
          const settings = client.getSettings(msg.guild);

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
          if (config['replied-to'] && msg.reference) {
            const replyMessage = await msg.channel.messages.fetch(msg.reference.messageId).catch(() => null);

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
          const attachments = [...msg.attachments.values()];
          const embed = new EmbedBuilder()
            .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
            .setThumbnail(msg.author.displayAvatarURL())
            .setDescription(msg.content || null)
            .setURL(msg.url)
            .addFields([
              { name: 'Author', value: msg.author.toString(), inline: true },
              { name: 'Channel', value: `<#${msg.channel.id}>`, inline: true },
              { name: 'Message', value: `[Jump To](${msg.url})`, inline: true },
            ])
            .setColor(config.color || settings.embedColor)
            .setFooter({ text: `${messageReaction.emoji} ${stars} | ${msg.id}` })
            .setTimestamp();

          processAttachments(attachments, embed, embeds);
          embeds.unshift(embed);

          // Add any existing message embeds AFTER the original embed
          if (msg.embeds.length > 0) {
            msg.embeds.forEach((msgEmbed) => embeds.push(EmbedBuilder.from(msgEmbed)));
          }

          let content = null;
          if (config['ping-author'] === true) {
            content = `<@${msg.author.id}>`;
          }

          if (existingStarMsg) {
            const starMessage = await starChannel.messages.fetch(existingStarMsg).catch(() => null);
            if (starMessage) {
              await starMessage.edit({ content, embeds });
            }
          } else {
            const starMessage = await starChannel.send({ content, embeds });
            await starMessage.react(messageReaction.emoji);
            await db.set(`servers.${msg.guild.id}.starboards.${name}.messages.${msg.id}`, starMessage.id);
          }
        }
      }
    }
  };

  const ticketSystem = async function (msg) {
    if (!(await db.get(`servers.${msg.guild.id}.tickets`))) return;

    const { catID, logID, roleID, reactionID } = await db.get(`servers.${msg.guild.id}.tickets`);
    if (!reactionID) return;

    if (reactionID !== msg.id) return;

    if (!msg.guild.members.me.permissions.has('ManageChannels')) {
      return msg.channel.send('The bot is missing `Manage Channels` permission.');
    }
    if (!msg.guild.members.me.permissions.has('ManageRoles')) {
      return msg.channel.send('The bot is missing `Manage Roles` permission');
    }
    if (!msg.guild.members.me.permissions.has('ManageMessages')) {
      return msg.channel.send('The bot is missing `Manage Messages` permission');
    }

    if (messageReaction._emoji.name !== '📰') return;
    const member = await msg.guild.members.fetch(user.id);
    messageReaction.users.remove(user.id);

    const perms = [
      {
        id: user.id,
        allow: ['ViewChannel'],
      },
      {
        id: msg.guild.members.me.id,
        allow: ['ViewChannel'],
      },
      {
        id: roleID,
        allow: ['ViewChannel'],
      },
      {
        id: msg.guild.id,
        deny: ['ViewChannel'],
      },
    ];

    const reason = `Ticket has been created from the reaction menu. Use \`${
      client.getSettings(msg.guild).prefix
    }topic\` command to change it.`;

    let channelName = member.displayName.toLowerCase();
    channelName = channelName.replace(/[^a-zA-Z\d:]/g, '');
    if (channelName.length === 0) {
      channelName = member.user.username.replace(/[^a-zA-Z\d:]/g, '');
      if (channelName.length === 0) {
        channelName = (Math.random().toString(36) + '00000000000000000').slice(2, 5);
      }
    }

    const tName = `ticket-${channelName}`;
    const tixChan = await msg.guild.channels.create({
      name: tName,
      type: ChannelType.GuildText,
      parent: catID,
      permissionOverwrites: perms,
      topic: reason,
    });

    await db.set(`servers.${msg.guild.id}.tickets.${tixChan.id}.owner`, member.id);

    const logEmbed = new EmbedBuilder()
      .setAuthor({ name: member.displayName, iconURL: member.user.displayAvatarURL() })
      .setTitle('New Ticket Created')
      .addFields([
        { name: 'Author', value: `${member} (${member.id})`, inline: false },
        { name: 'Channel', value: `${tixChan} \n(${tName}: ${tixChan.id})`, inline: false },
        { name: 'Reason', value: reason, inline: false },
      ])
      .setColor('#E65DF4')
      .setTimestamp();
    const logChan = msg.guild.channels.cache.get(logID);
    await logChan.send({ embeds: [logEmbed] }).catch(() => {});

    const chanEmbed = new EmbedBuilder()
      .setAuthor({ name: member.displayName, iconURL: member.user.displayAvatarURL() })
      .setTitle(`${member.displayName}'s Ticket`)
      .addFields([{ name: 'Reason', value: reason, inline: false }])
      .setDescription('Please wait patiently and our support team will be with you shortly.')
      .setColor('#E65DF4')
      .setTimestamp();
    const role = msg.guild.roles.cache.get(roleID);

    if (!role.mentionable) {
      if (!tixChan.permissionsFor(client.user.id).has('MentionEveryone')) {
        await role.setMentionable(true);
        await tixChan.send({ content: role.toString(), embeds: [chanEmbed] }).catch(() => {});
        return await role.setMentionable(false);
      }
    }

    await tixChan.send({ content: role.toString(), embeds: [chanEmbed] }).catch(() => {});
  };

  try {
    await starboardSystem(msg);
  } catch (error) {
    console.error('Starboard Error:', error);
  }

  await ticketSystem(msg);
}
