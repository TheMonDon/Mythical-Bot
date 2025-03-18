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
    const overrides = (await db.get(`servers.${msg.guild.id}.overrides`)) || {};

    const getStarboardConfig = (starboardName, channelId) => {
      const baseConfig = starboards[starboardName];
      if (!baseConfig) return null;

      // Find the first override that applies to this channel
      for (const [overrideName, overrideConfig] of Object.entries(overrides)) {
        if (overrideConfig.starboard === starboardName && overrideConfig.channels.includes(channelId)) {
          return { ...baseConfig, ...overrideConfig, overrideName };
        }
      }

      return baseConfig; // Default config if no override applies
    };

    for (const name of Object.keys(starboards)) {
      const config = getStarboardConfig(name, msg.channel.id);
      // Now you can use `config`, which will either be the default starboard config or an overridden one

      if (!config.enabled) continue;
      if (msg.author.bot && !config['allow-bots']) continue;

      const messageAge = Date.now() - msg.createdTimestamp;

      if (config['older-than'] !== null && messageAge < config['older-than']) continue;
      if (config['newer-than'] !== null && messageAge > config['newer-than']) continue;

      const matchEmoji = (reaction, emojiConfig) => {
        if (emojiConfig.startsWith('<') && emojiConfig.endsWith('>')) {
          const emojiId = emojiConfig.split(':')[2].slice(0, -1);
          return reaction.emoji.id === emojiId;
        } else {
          return reaction.emoji.name === emojiConfig;
        }
      };

      const getReactionUsers = async (reactions, emojiConfig) => {
        if (!reactions) return [];
        let reaction;

        if (emojiConfig.startsWith('<') && emojiConfig.endsWith('>')) {
          const emojiId = emojiConfig.split(':')[2].slice(0, -1);
          reaction = reactions.find((r) => r.emoji.id === emojiId);
        } else {
          reaction = reactions.find((r) => r.emoji.name === emojiConfig);
        }

        if (!reaction) return [];

        try {
          if (reaction.users.cache.size < reaction.count) {
            await reaction.users.fetch();
          }
          return reaction.users.cache.map((user) => user.id);
        } catch (error) {
          console.error('Error fetching reaction users:', error);
          return [];
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
        let embed = 0;
        if (msg.embeds[0]?.author?.name.startsWith('Replying to')) {
          embed = 1;
        }

        const authorField = msg.embeds[embed]?.fields.find((field) => field.name === 'Author');
        if (!authorField) continue;

        const footerText = msg.embeds[embed]?.footer?.text;
        if (!footerText) continue;

        const originalMsgId = footerText.split('|')[1]?.trim();
        if (!originalMsgId) continue;

        const channelField = msg.embeds[embed].fields.find((field) => field.name === 'Channel');
        if (!channelField) continue;

        const channelId = channelField.value.replace(/[<#>]/g, '');
        const originalChannel = msg.guild.channels.cache.get(channelId);
        if (!originalChannel) continue;

        const upVoteCounter = new Set();
        const downVoteCounter = new Set();

        const starboardUpvoters = await getReactionUsers(msg.reactions.cache, config.emoji);
        starboardUpvoters.forEach((id) => upVoteCounter.add(id));

        if (config['downvote-emoji']) {
          const starboardDownvoters = await getReactionUsers(msg.reactions.cache, config['downvote-emoji']);
          starboardDownvoters.forEach((id) => downVoteCounter.add(id));
        }

        try {
          const originalMsg = await originalChannel.messages.fetch(originalMsgId).catch(() => null);
          if (originalMsg) {
            // Check if the reaction is from the original author and if self-vote is disabled
            if (!config['self-vote'] && originalMsg.author.id === user.id) {
              if (config['remove-invalid-reactions']) {
                await messageReaction.users
                  .remove(user.id)
                  .catch(() => console.log(`Failed to remove self-vote reaction in starboard for user ${user.id}`));
              }
              continue;
            }

            const originalUpvoters = await getReactionUsers(originalMsg.reactions.cache, config.emoji);
            originalUpvoters.forEach((id) => upVoteCounter.add(id));
          }
        } catch (err) {
          console.error('Failed to fetch original message:', err);
        }

        upVoteCounter.delete(client.user.id);
        downVoteCounter.delete(client.user.id);

        const netVotes = config['downvote-emoji'] ? upVoteCounter.size - downVoteCounter.size : upVoteCounter.size;

        const replyEmbed = embed === 1 ? EmbedBuilder.from(msg.embeds[0]) : null;
        const newEmbed = EmbedBuilder.from(msg.embeds[embed === 1 ? 1 : 0]);

        newEmbed.setFooter({
          text: `${config.emoji} ${netVotes} | ${originalMsgId}`,
        });

        let newEmbeds = [];
        if (config['extra-embeds'] && msg.embeds?.length > (embed === 1 ? 2 : 1)) {
          newEmbeds = msg.embeds
            .slice(embed === 1 ? 2 : 1)
            .map((embed) => EmbedBuilder.from(embed))
            .slice(0, 8);
        }

        await msg
          .edit({ embeds: replyEmbed ? [replyEmbed, newEmbed, ...newEmbeds] : [newEmbed, ...newEmbeds] })
          .catch((e) => console.error('Error updating starboard message:', e));

        if (netVotes < config.threshold) {
          await msg.delete().catch(() => null);
          await db.delete(`servers.${msg.guild.id}.starboards.${name}.messages.${originalMsgId}`);
        } else {
          await db.set(`servers.${msg.guild.id}.starboards.${name}.messages.${originalMsgId}.stars`, netVotes);
        }

        continue;
      }

      // Reaction on a regular message
      if (!config['self-vote'] && msg.author.id === user.id) {
        if (config['remove-invalid-reactions']) {
          await messageReaction.users
            .remove(user.id)
            .catch(() => console.log(`Failed to remove self-vote reaction in starboard for user ${user.id}`));
        }
        continue;
      }

      const upVoteCounter = new Set();
      const downVoteCounter = new Set();

      const originalUpvoters = await getReactionUsers(msg.reactions.cache, config.emoji);
      originalUpvoters.forEach((id) => upVoteCounter.add(id));

      if (config['downvote-emoji']) {
        const originalDownvoters = await getReactionUsers(msg.reactions.cache, config['downvote-emoji']);
        originalDownvoters.forEach((id) => downVoteCounter.add(id));
      }

      upVoteCounter.delete(client.user.id);
      downVoteCounter.delete(client.user.id);

      let netVotes = config['downvote-emoji'] ? upVoteCounter.size - downVoteCounter.size : upVoteCounter.size;

      const existingStarMsgId = await db.get(
        `servers.${msg.guild.id}.starboards.${name}.messages.${msg.id}.starboardMsgId`,
      );

      if (existingStarMsgId) {
        const starMessage = await starChannel.messages.fetch(existingStarMsgId).catch(() => null);
        if (starMessage) {
          const starboardUpvoters = await getReactionUsers(starMessage.reactions.cache, config.emoji);
          starboardUpvoters.forEach((id) => upVoteCounter.add(id));

          if (config['downvote-emoji']) {
            const starboardDownvoters = await getReactionUsers(starMessage.reactions.cache, config['downvote-emoji']);
            starboardDownvoters.forEach((id) => downVoteCounter.add(id));
          }

          upVoteCounter.delete(client.user.id);
          downVoteCounter.delete(client.user.id);

          netVotes = config['downvote-emoji'] ? upVoteCounter.size - downVoteCounter.size : upVoteCounter.size;
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

          if (config['attachments-list']) {
            if (attachmentMessage.length > 0) {
              embed.addFields([{ name: 'Attachments', value: attachmentMessage.join('\n'), inline: true }]);
            }
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

              if (config['show-thumbnail']) {
                replyEmbed.setThumbnail(replyMessage.author.displayAvatarURL());
              }

              if (config['use-server-profile']) {
                replyEmbed.setAuthor({
                  name: `Replying to ${replyMessage.member.displayName}`,
                  iconURL: replyMessage.member.displayAvatarURL(),
                });
                if (config['show-thumbnail']) {
                  replyEmbed.setThumbnail(replyMessage.member.displayAvatarURL());
                }
              }

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

        if (config['show-thumbnail']) {
          embed.setThumbnail(msg.author.displayAvatarURL());
        }

        if (config['use-server-profile']) {
          embed.setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() });
          if (config['show-thumbnail']) {
            embed.setThumbnail(msg.member.displayAvatarURL());
          }
        }

        processAttachments(attachments, embed, embeds);
        embeds.unshift(embed);
        if (replyEmbed) {
          embeds.unshift(replyEmbed);
        }

        if (msg.embeds?.length > 0) {
          if (config['extra-embeds']) {
            msg.embeds.slice(0, 8).forEach((msgEmbed) => embeds.push(EmbedBuilder.from(msgEmbed)));
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
