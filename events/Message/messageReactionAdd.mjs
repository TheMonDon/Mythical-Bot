import { EmbedBuilder } from 'discord.js';

export async function run(client, messageReaction, user) {
  if (user?.bot) return;
  if (!messageReaction) return;
  const msg = messageReaction.message;

  const starboardSystem = async function (client, msg) {
    const connection = await client.db.getConnection();

    try {
      if (messageReaction.partial) {
        try {
          await messageReaction.fetch();
        } catch (error) {
          return console.error('Failed to fetch reaction:', error);
        }
      }

      if (msg.partial) {
        try {
          await msg.fetch();
        } catch (error) {
          return console.error('Failed to fetch message:', error);
        }
      }

      const [starboards] = await connection.query(
        /* sql */ `
          SELECT
            *
          FROM
            starboards
          WHERE
            server_id = ?
        `,
        [msg.guild.id],
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
        [msg.guild.id],
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
        const config = getStarboardConfig(sb.name, msg.channel.id);
        // Now you can use `config`, which will either be the default starboard config or an overridden one

        if (config.enabled === 0) continue;
        if (msg.author.bot && !config.allow_bots) continue;

        const messageAge = Date.now() - msg.createdTimestamp;

        if (config.older_than !== null && messageAge < config.older_than) continue;
        if (config.newer_than !== null && messageAge > config.newer_than) continue;

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

        const isStarboardReaction = messageReaction.emoji.name === config.emoji;
        const isAntiStarboardReaction = config.downvote_emoji && messageReaction.emoji.name === config.downvote_emoji;

        if (!isStarboardReaction && !isAntiStarboardReaction) continue;

        const starChannel = msg.guild.channels.cache.get(config.channel_id);
        if (
          !starChannel ||
          !starChannel.permissionsFor(msg.guild.members.me).has(['SendMessages', 'ViewChannel', 'EmbedLinks'])
        )
          continue;

        const isStarboardChannel = msg.channel.id === config.channel_id;

        if (msg.channel.nsfw && !starChannel.nsfw) {
          if (config.remove_invalid_reactions) {
            await messageReaction.remove().catch(() => console.log('Failed to remove reaction from NSFW message'));
          }
          continue;
        }

        // Reaction on a message in the starboard channel
        if (isStarboardChannel) {
          // Fetch the original message's channel ID from the database entry
          const [rows] = await connection.query(
            /* sql */
            `
              SELECT
                channel_id
              FROM
                starboard_messages
              WHERE
                starboard_id = ?
                AND starboard_msg_id = ?
            `,
            [sb.id, msg.id],
          );

          const originalChannelId = rows[0]?.channel_id;

          // Use this fetched ID to get the correct starboard configuration
          const config = getStarboardConfig(sb.name, originalChannelId);

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

          const channelID = channelField.value.replace(/[<#>]/g, '');
          const originalChannel = msg.guild.channels.cache.get(channelID);
          if (!originalChannel) continue;

          const upVoteCounter = new Set();
          const downVoteCounter = new Set();

          const starboardUpvoters = await getReactionUsers(msg.reactions.cache, config.emoji);
          starboardUpvoters.forEach((id) => upVoteCounter.add(id));

          if (config.downvote_emoji) {
            const starboardDownvoters = await getReactionUsers(msg.reactions.cache, config.downvote_emoji);
            starboardDownvoters.forEach((id) => downVoteCounter.add(id));

            const originalDownvoters = await getReactionUsers(msg.reactions.cache, config.downvote_emoji);
            originalDownvoters.forEach((id) => downVoteCounter.add(id));
          }

          try {
            const originalMsg = await originalChannel.messages.fetch(originalMsgId).catch(() => null);
            if (originalMsg) {
              // Check if the reaction is from the original author and if self-vote is disabled
              if (!config.self_vote && originalMsg.author.id === user.id) {
                if (config.remove_invalid_reactions) {
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

          const netVotes = config.downvote_emoji ? upVoteCounter.size - downVoteCounter.size : upVoteCounter.size;

          const replyEmbed = embed === 1 ? EmbedBuilder.from(msg.embeds[0]) : null;
          const newEmbed = EmbedBuilder.from(msg.embeds[embed === 1 ? 1 : 0]);

          newEmbed.setFooter({
            text: `${config.display_emoji} ${netVotes} | ${originalMsgId}`,
          });

          let newEmbeds = [];
          if (config.extra_embeds && msg.embeds?.length > (embed === 1 ? 2 : 1)) {
            newEmbeds = msg.embeds
              .slice(embed === 1 ? 2 : 1)
              .map((embed) => EmbedBuilder.from(embed))
              .slice(0, 8);
          }

          await msg
            .edit({ embeds: replyEmbed ? [replyEmbed, newEmbed, ...newEmbeds] : [newEmbed, ...newEmbeds] })
            .catch((e) => console.error('Error updating starboard message:', e));

          if (
            config.threshold_remove &&
            config.threshold_remove !== 'unset' &&
            netVotes <= Number(config.threshold_remove)
          ) {
            await msg.delete().catch(() => null);

            await connection.query(
              /* sql */
              `
                DELETE FROM starboard_messages
                WHERE
                  starboard_id = ?
                  AND original_msg_id = ?
              `,
              [sb.id, originalMsgId],
            );
          } else {
            // Update existing stars count
            await connection.query(
              /* sql */
              `
                UPDATE starboard_messages
                SET
                  stars = ?
                WHERE
                  starboard_id = ?
                  AND original_msg_id = ?
              `,
              [netVotes, sb.id, originalMsgId],
            );
          }

          continue;
        }

        // Reaction on a regular message
        if (!config.self_vote && msg.author.id === user.id) {
          if (config.remove_invalid_reactions) {
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

        if (config.downvote_emoji) {
          const originalDownvoters = await getReactionUsers(msg.reactions.cache, config.downvote_emoji);
          originalDownvoters.forEach((id) => downVoteCounter.add(id));
        }

        upVoteCounter.delete(client.user.id);
        downVoteCounter.delete(client.user.id);

        let netVotes = config.downvote_emoji ? upVoteCounter.size - downVoteCounter.size : upVoteCounter.size;

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
          [sb.id, msg.id],
        );
        const existingStarMsgId = rows.length ? rows[0].starboard_msg_id : null;

        if (existingStarMsgId) {
          const starMessage = await starChannel.messages.fetch(existingStarMsgId).catch(() => null);
          if (starMessage) {
            const starboardUpvoters = await getReactionUsers(starMessage.reactions.cache, config.emoji);
            starboardUpvoters.forEach((id) => upVoteCounter.add(id));

            if (config.downvote_emoji) {
              const starboardDownvoters = await getReactionUsers(starMessage.reactions.cache, config.downvote_emoji);
              starboardDownvoters.forEach((id) => downVoteCounter.add(id));
            }

            upVoteCounter.delete(client.user.id);
            downVoteCounter.delete(client.user.id);

            netVotes = config.downvote_emoji ? upVoteCounter.size - downVoteCounter.size : upVoteCounter.size;
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

            if (config.attachments_list) {
              if (attachmentMessage.length > 0) {
                embed.addFields([{ name: 'Attachments', value: attachmentMessage.join('\n'), inline: true }]);
              }
            }
          };

          let replyEmbed;
          if (config.replied_to && msg.reference) {
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

                if (config.show_thumbnail) {
                  replyEmbed.setThumbnail(replyMessage.author.displayAvatarURL());
                }

                if (config.use_server_profile) {
                  if (replyMessage.member) {
                    replyEmbed.setAuthor({
                      name: `Replying to ${replyMessage.member.displayName}`,
                      iconURL: replyMessage.member.displayAvatarURL(),
                    });
                    if (config.show_thumbnail) {
                      replyEmbed.setThumbnail(replyMessage.member.displayAvatarURL());
                    }
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
          if (config.require_image) {
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
            .setFooter({ text: `${config.display_emoji} ${netVotes} | ${msg.id}` })
            .setTimestamp();

          if (config.show_thumbnail) {
            embed.setThumbnail(msg.author.displayAvatarURL());
          }

          if (config.use_server_profile) {
            embed.setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() });
            if (config.show_thumbnail) {
              embed.setThumbnail(msg.member.displayAvatarURL());
            }
          }

          processAttachments(attachments, embed, embeds);
          embeds.unshift(embed);
          if (replyEmbed) {
            embeds.unshift(replyEmbed);
          }

          if (msg.embeds?.length > 0) {
            if (config.extra_embeds) {
              msg.embeds.slice(0, 8).forEach((msgEmbed) => embeds.push(EmbedBuilder.from(msgEmbed)));
            }
          }

          const content = config.ping_author ? `<@${msg.author.id}>` : null;

          if (existingStarMsgId && config.threshold_remove !== 'unset' && netVotes <= Number(config.threshold_remove)) {
            try {
              const starMessage = await starChannel.messages.fetch(existingStarMsgId).catch(() => null);
              if (starMessage) {
                await starMessage.delete();
                await connection.query(
                  /* sql */
                  `
                    DELETE FROM starboard_messages
                    WHERE
                      starboard_id = ?
                      AND original_msg_id = ?
                  `,
                  [sb.id, msg.id],
                );
              }
            } catch (err) {
              console.error('Error deleting starboard message:', err);
            }
            continue;
          }

          if (existingStarMsgId) {
            const starMessage = await starChannel.messages.fetch(existingStarMsgId).catch(() => null);

            if (starMessage) {
              const embedsToUpdate = starMessage.embeds.map((embed) => EmbedBuilder.from(embed));
              const mainEmbed = embedsToUpdate.find((embed) => embed.data.footer?.text.endsWith(msg.id));

              if (mainEmbed) {
                mainEmbed.setFooter({
                  text: `${config.display_emoji} ${netVotes} | ${msg.id}`,
                });

                await starMessage
                  .edit({ embeds: embedsToUpdate })
                  .catch((e) => console.error('Error updating starboard message with new vote count:', e));

                await connection.query(
                  /* sql */
                  `
                    UPDATE starboard_messages
                    SET
                      stars = ?
                    WHERE
                      starboard_id = ?
                      AND original_msg_id = ?
                  `,
                  [netVotes, sb.id, msg.id],
                );
              }
            } else {
              // Starboard message was deleted in Discord, create a new one
              try {
                const starMessage = await starChannel.send({ content, embeds });

                if (config.autoreact_upvote) {
                  await starMessage.react(config.emoji);
                }

                if (config.downvote_emoji && config.downvote_emoji !== 'None' && config.autoreact_downvote) {
                  await starMessage.react(config.downvote_emoji);
                }

                // Replace DB entry with new message
                await connection.query(
                  /* sql */
                  `
                    INSERT INTO
                      starboard_messages (
                        starboard_id,
                        original_msg_id,
                        starboard_msg_id,
                        stars,
                        author_id,
                        channel_id
                      )
                    VALUES
                      (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY
                    UPDATE starboard_msg_id =
                    VALUES
                      (starboard_msg_id),
                      stars =
                    VALUES
                      (stars)
                  `,
                  [sb.id, msg.id, starMessage.id, netVotes, msg.author.id, msg.channel.id],
                );
              } catch (err) {
                console.error('Error creating new starboard message:', err);
              }
            }
          } else {
            // No existing starboard entry → create one fresh
            try {
              const starMessage = await starChannel.send({ content, embeds });

              if (config.autoreact_upvote) {
                await starMessage.react(config.emoji);
              }

              if (config.downvote_emoji && config.autoreact_downvote) {
                await starMessage.react(config.downvote_emoji);
              }

              // Insert DB entry
              await connection.query(
                /* sql */
                `
                  INSERT INTO
                    starboard_messages (
                      starboard_id,
                      original_msg_id,
                      starboard_msg_id,
                      stars,
                      author_id,
                      channel_id
                    )
                  VALUES
                    (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY
                  UPDATE starboard_msg_id =
                  VALUES
                    (starboard_msg_id),
                    stars =
                  VALUES
                    (stars)
                `,
                [sb.id, msg.id, starMessage.id, netVotes, msg.author.id, msg.channel.id],
              );
            } catch (err) {
              console.error('Error creating new starboard message:', err);
            }
          }
        } else if (existingStarMsgId) {
          // This is the new block for updating the embed when votes fall below threshold
          const starMessage = await starChannel.messages.fetch(existingStarMsgId).catch(() => null);
          if (starMessage) {
            const newEmbeds = starMessage.embeds.map((embed) => EmbedBuilder.from(embed));
            newEmbeds[0].setFooter({
              text: `${config.display_emoji} ${netVotes} | ${msg.id}`,
            });

            await starMessage
              .edit({ embeds: newEmbeds })
              .catch((e) => console.error('Error updating starboard message with new vote count:', e));

            await connection.query(
              /* sql */
              `
                UPDATE starboard_messages
                SET
                  stars = ?
                WHERE
                  starboard_id = ?
                  AND original_msg_id = ?
              `,
              [netVotes, sb.id, msg.id],
            );
          }
        }
      }
    } catch (error) {
      client.logger.error(error);
    } finally {
      connection.release();
    }
  };

  await starboardSystem(client, msg);
}
