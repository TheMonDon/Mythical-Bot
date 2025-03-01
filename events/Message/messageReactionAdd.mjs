import { ChannelType, EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, messageReaction, user) {
  if (user?.bot) return;
  if (!messageReaction) return;
  const msg = messageReaction.message;

  const starboardSystem = async function (msg) {
    if (messageReaction.partial) {
      try {
        await messageReaction.fetch();
      } catch (error) {
        console.error('Failed to fetch reaction:', error);
        return;
      }
    }

    if (msg.partial) {
      try {
        await msg.fetch();
      } catch (error) {
        console.error('Failed to fetch message:', error);
        return;
      }
    }

    const starboards = (await db.get(`servers.${msg.guild.id}.starboards`)) || {};

    for (const [name, config] of Object.entries(starboards)) {
      if (!config.enabled) continue;
      if (msg.author.bot && !config['allow-bots']) continue;

      const matchEmoji = (reaction, emojiConfig) => {
        if (emojiConfig.startsWith('<') && emojiConfig.endsWith('>')) {
          const emojiId = emojiConfig.split(':')[2].slice(0, -1);
          return reaction.emoji.id === emojiId;
        } else {
          return reaction.emoji.name === emojiConfig;
        }
      };

      const findReactionCount = (reactions, emojiConfig) => {
        if (!reactions) return 0;
        if (emojiConfig.startsWith('<') && emojiConfig.endsWith('>')) {
          const emojiId = emojiConfig.split(':')[2].slice(0, -1);
          return reactions.find((r) => r.emoji.id === emojiId)?.count || 0;
        } else {
          return reactions.find((r) => r.emoji.name === emojiConfig)?.count || 0;
        }
      };

      const isStarboardReaction = matchEmoji(messageReaction, config.emoji);
      const isAntiStarboardReaction = config['downvote-emoji'] && matchEmoji(messageReaction, config['downvote-emoji']);

      if (!isStarboardReaction && !isAntiStarboardReaction) continue;

      const starChannel = msg.guild.channels.cache.get(config.channelId);
      if (
        !starChannel ||
        !starChannel.permissionsFor(msg.guild.members.me).has(['SendMessages', 'ViewChannel', 'EmbedLinks'])
      )
        continue;

      const isStarboardChannel = msg.channel.id === config.channelId;

      if (msg.channel.nsfw && !starChannel.nsfw) {
        if (config['remove-invalid-reactions']) {
          await messageReaction.remove().catch(() => console.log('Failed to remove reaction from NSFW message'));
        }
        continue;
      }

      // Reaction on a message in the starboard channel
      if (isStarboardChannel) {
        const footerText = msg.embeds[0]?.footer?.text;
        if (!footerText) continue;

        const originalMsgId = footerText.split('|')[1]?.trim();
        if (!originalMsgId) continue;

        const channelField = msg.embeds[0].fields.find((field) => field.name === 'Channel');
        if (!channelField) continue;

        const channelId = channelField.value.replace(/[<#>]/g, '');
        const originalChannel = msg.guild.channels.cache.get(channelId);
        if (!originalChannel) continue;

        const upvotes = findReactionCount(msg.reactions.cache, config.emoji);
        const downvotes = config['downvote-emoji']
          ? findReactionCount(msg.reactions.cache, config['downvote-emoji'])
          : 0;

        let originalMsgUpvotes = 0;
        try {
          const originalMsg = await originalChannel.messages.fetch(originalMsgId).catch(() => null);
          if (originalMsg) {
            originalMsgUpvotes = findReactionCount(originalMsg.reactions.cache, config.emoji);
          }
        } catch (err) {
          console.error('Failed to fetch original message:', err);
        }

        const adjustedUpvotes = Math.max(0, upvotes - 1);
        const adjustedDownvotes = Math.max(0, downvotes - 1);

        const netVotes = config['downvote-emoji']
          ? adjustedUpvotes + originalMsgUpvotes - adjustedDownvotes
          : adjustedUpvotes + originalMsgUpvotes;

        const newEmbed = EmbedBuilder.from(msg.embeds[0]);
        newEmbed.setFooter({
          text: `${config.emoji} ${netVotes} | ${originalMsgId}`,
        });

        const newEmbeds = msg.embeds.slice(1).map((embed) => EmbedBuilder.from(embed));

        await msg
          .edit({ embeds: [newEmbed, ...newEmbeds] })
          .catch((e) => console.error('Error updating starboard message:', e));

        if (netVotes < config.threshold) {
          await msg.delete().catch(() => null);
          await db.delete(`servers.${msg.guild.id}.starboards.${name}.messages.${originalMsgId}`);
        }

        continue;
      }

      // Reaction on a regular message
      if (!config['self-vote'] && msg.author.id === user.id) {
        if (config['remove-invalid-reactions']) {
          await messageReaction.remove().catch(() => console.log('Failed to remove reaction'));
        }
        continue;
      }

      const upvoteReaction = msg.reactions.cache.find((r) => matchEmoji(r, config.emoji));

      const originalUpvotes = upvoteReaction ? upvoteReaction.count : 0;

      let netVotes = originalUpvotes;

      const existingStarMsgId = await db.get(
        `servers.${msg.guild.id}.starboards.${name}.messages.${msg.id}.starboardMsgId`,
      );

      if (existingStarMsgId) {
        const starMessage = await starChannel.messages.fetch(existingStarMsgId).catch(() => null);
        if (starMessage) {
          const starboardUpvoteReaction = starMessage.reactions.cache.find((r) => matchEmoji(r, config.emoji));
          const starboardDownvoteReaction = config['downvote-emoji']
            ? starMessage.reactions.cache.find((r) => matchEmoji(r, config['downvote-emoji']))
            : null;

          const starboardUpvotes = starboardUpvoteReaction ? Math.max(0, starboardUpvoteReaction.count - 1) : 0; // Subtract bot's reaction
          const starboardDownvotes = starboardDownvoteReaction ? Math.max(0, starboardDownvoteReaction.count - 1) : 0;

          const starboardNetVotes = config['downvote-emoji'] ? starboardUpvotes - starboardDownvotes : starboardUpvotes;

          netVotes += starboardNetVotes;
        }
      }

      if (netVotes >= config.threshold) {
        const embeds = [];
        const settings = client.getSettings(msg.guild);

        const processAttachments = (attachments, embed, embedsArray) => {
          if (!attachments || attachments.length === 0) return;

          const attachmentMessage = [];

          if (attachments[0].contentType?.startsWith('image')) {
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

        let replyEmbed;
        if (config['replied-to'] && msg.reference) {
          try {
            const replyMessage = await msg.channel.messages.fetch(msg.reference.messageId).catch(() => null);
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
          } catch (err) {
            console.error('Error handling reply-to message:', err);
          }
        }

        const attachments = [...msg.attachments.values()];
        if (config['require-image']) {
          if (!attachments || attachments.length === 0) continue;
        }

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
          .setFooter({ text: `${config.emoji} ${netVotes} | ${msg.id}` })
          .setTimestamp();

        processAttachments(attachments, embed, embeds);
        embeds.unshift(embed);
        if (replyEmbed) {
          embeds.unshift(replyEmbed);
        }

        if (msg.embeds?.length > 0) {
          if (config['extra-embeds']) {
            msg.embeds.forEach((msgEmbed) => embeds.push(EmbedBuilder.from(msgEmbed)));
          }
        }

        const content = config['ping-author'] ? `<@${msg.author.id}>` : null;

        if (existingStarMsgId) {
          const starMessage = await starChannel.messages.fetch(existingStarMsgId).catch(() => null);
          if (starMessage) {
            await starMessage.edit({ content, embeds }).catch((err) => {
              console.error('Error updating starboard message:', err);
            });
            await db.set(`servers.${msg.guild.id}.starboards.${name}.messages.${msg.id}.stars`, netVotes);
          } else {
            try {
              const starMessage = await starChannel.send({ content, embeds });

              if (config['autoreact-upvote']) {
                await starMessage.react(config.emoji);
              }

              if (config['downvote-emoji'] && config['autoreact-downvote']) {
                await starMessage.react(config['downvote-emoji']);
              }

              await db.set(`servers.${msg.guild.id}.starboards.${name}.messages.${msg.id}`, {
                starboardMsgId: starMessage.id,
                stars: netVotes, // Store the number of stars
                author: msg.author.id, // Store the message author's ID
                channel: msg.channel.id, // Store the original channel ID
              });
            } catch (err) {
              console.error('Error creating new starboard message:', err);
            }
          }
        } else {
          try {
            const starMessage = await starChannel.send({ content, embeds });

            if (config['autoreact-upvote']) {
              await starMessage.react(config.emoji);
            }

            if (config['downvote-emoji'] && config['autoreact-downvote']) {
              await starMessage.react(config['downvote-emoji']);
            }

            await db.set(`servers.${msg.guild.id}.starboards.${name}.messages.${msg.id}`, {
              starboardMsgId: starMessage.id,
              stars: netVotes, // Store the number of stars
              author: msg.author.id, // Store the message author's ID
              channel: msg.channel.id, // Store the original channel ID
            });
          } catch (err) {
            console.error('Error creating new starboard message:', err);
          }
        }
      } else if (existingStarMsgId) {
        try {
          const starMessage = await starChannel.messages.fetch(existingStarMsgId).catch(() => null);
          if (starMessage) {
            await starMessage.delete();
            await db.delete(`servers.${msg.guild.id}.starboards.${name}.messages.${msg.id}`);
          }
        } catch (err) {
          console.error('Error deleting starboard message:', err);
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
