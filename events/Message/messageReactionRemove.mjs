import { EmbedBuilder } from 'discord.js';

export async function run(client, messageReaction, user) {
  if (user?.bot) return;
  if (!messageReaction) return;
  const msg = messageReaction.message;

  const connection = await client.db.getConnection();

  try {
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

    function getStarboardConfig(starboardName, channelId) {
      const base = starboards.find((s) => s.name === starboardName);
      if (!base) return null;

      const override = overrides.find(
        (o) => o.starboard_name === starboardName && JSON.parse(o.channels || '[]').includes(channelId),
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

      if (!config.enabled) continue;
      if (msg.author.bot && !config.allow_bots) continue;

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
      const isAntiStarboardReaction = config.downvote_emoji && matchEmoji(messageReaction, config.downvote_emoji);

      if (!isStarboardReaction && !isAntiStarboardReaction) continue;

      const starChannel = msg.guild.channels.cache.get(config.channel_id);

      if (msg.channel.nsfw && !starChannel.nsfw) continue;

      if (
        !starChannel ||
        !starChannel.permissionsFor(msg.guild.members.me).has(['SendMessages', 'ViewChannel', 'EmbedLinks'])
      ) {
        continue;
      }

      const isStarboardChannel = msg.channel.id === config.channel_id;

      // Reaction removed from a message in the starboard channel
      if (isStarboardChannel) {
        let embed = 0;
        if (msg.embeds[0]?.author?.name.startsWith('Replying to')) {
          embed = 1;
        }

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

        if (config.downvote_emoji) {
          const starboardDownvoters = await getReactionUsers(msg.reactions.cache, config.downvote_emoji);
          starboardDownvoters.forEach((id) => downVoteCounter.add(id));
        }

        try {
          const originalMsg = await originalChannel.messages.fetch(originalMsgId).catch(() => null);
          if (originalMsg) {
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

        if ((config.threshold_remove || config.threshold_remove === 0) && netVotes <= config.threshold_remove) {
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

      // Reaction removed from a regular message

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
      if (!existingStarMsgId) continue;

      const starMessage = await starChannel.messages.fetch(existingStarMsgId).catch(() => null);
      if (!starMessage) continue;

      const upVoteCounter = new Set();
      const downVoteCounter = new Set();

      const originalUpvoters = await getReactionUsers(msg.reactions.cache, config.emoji);
      originalUpvoters.forEach((id) => upVoteCounter.add(id));

      const starboardUpvoters = await getReactionUsers(starMessage.reactions.cache, config.emoji);
      starboardUpvoters.forEach((id) => upVoteCounter.add(id));

      if (config.downvote_emoji) {
        const starboardDownvoters = await getReactionUsers(starMessage.reactions.cache, config.downvote_emoji);
        starboardDownvoters.forEach((id) => downVoteCounter.add(id));
      }

      upVoteCounter.delete(client.user.id);
      downVoteCounter.delete(client.user.id);

      const netVotes = config.downvote_emoji ? upVoteCounter.size - downVoteCounter.size : upVoteCounter.size;

      if (netVotes >= config.threshold) {
        const newEmbeds = starMessage.embeds.map((embed) => EmbedBuilder.from(embed));

        newEmbeds[0].setFooter({
          text: `${config.display_emoji} ${netVotes} | ${msg.id}`,
        });

        const content = config.ping_author ? `<@${msg.author.id}>` : null;

        await starMessage
          .edit({ content, embeds: newEmbeds })
          .catch((e) => console.error('Error updating starboard message:', e));

        // Update the stars in MySQL
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
      } else if ((config.threshold_remove || config.threshold_remove === 0) && netVotes <= config.threshold_remove) {
        // Remove starboard message from Discord
        const verifyMessage = await starChannel.messages.fetch(existingStarMsgId).catch(() => null);
        if (verifyMessage && verifyMessage.id === existingStarMsgId) {
          await verifyMessage.delete().catch(() => null);
        }

        // Delete row from MySQL
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
    }
  } catch (error) {
    console.error('Starboard reaction remove error:', error);
  } finally {
    connection.release();
  }
}
