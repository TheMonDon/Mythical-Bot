import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, messageReaction, user) {
  if (user?.bot) return;
  if (!messageReaction) return;
  const msg = messageReaction.message;

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

      if (msg.channel.nsfw && !starChannel.nsfw) continue;

      if (
        !starChannel ||
        !starChannel.permissionsFor(msg.guild.members.me).has(['SendMessages', 'ViewChannel', 'EmbedLinks'])
      ) {
        continue;
      }

      const isStarboardChannel = msg.channel.id === config.channelId;

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

      // Reaction removed from a regular message
      const upvoteReaction = msg.reactions.cache.find((r) => matchEmoji(r, config.emoji));

      const originalUpvotes = upvoteReaction ? upvoteReaction.count : 0;

      let netVotes = originalUpvotes;

      const existingStarMsgId = await db.get(
        `servers.${msg.guild.id}.starboards.${name}.messages.${msg.id}.starboardMsgId`,
      );
      if (!existingStarMsgId) continue;

      const starMessage = await starChannel.messages.fetch(existingStarMsgId).catch(() => null);
      if (!starMessage) continue;

      const starboardUpvoteReaction = starMessage.reactions.cache.find((r) => matchEmoji(r, config.emoji));
      const starboardDownvoteReaction = config['downvote-emoji']
        ? starMessage.reactions.cache.find((r) => matchEmoji(r, config['downvote-emoji']))
        : null;

      const starboardUpvotes = starboardUpvoteReaction ? Math.max(0, starboardUpvoteReaction.count - 1) : 0; // Subtract bot's reaction
      const starboardDownvotes = starboardDownvoteReaction ? Math.max(0, starboardDownvoteReaction.count - 1) : 0;

      const starboardNetVotes = config['downvote-emoji'] ? starboardUpvotes - starboardDownvotes : starboardUpvotes;

      netVotes += starboardNetVotes;

      if (netVotes >= config.threshold) {
        const newEmbeds = starMessage.embeds.map((embed) => EmbedBuilder.from(embed));

        newEmbeds[0].setFooter({
          text: `${config.emoji} ${netVotes} | ${msg.id}`,
        });

        const content = config['ping-author'] ? `<@${msg.author.id}>` : null;

        await starMessage
          .edit({ content, embeds: newEmbeds })
          .catch((e) => console.error('Error updating starboard message:', e));
        await db.set(`servers.${msg.guild.id}.starboards.${name}.messages.${msg.id}.stars`, netVotes);
      } else {
        await starMessage.delete().catch((e) => console.error('Error deleting starboard message:', e));
        await db.delete(`servers.${msg.guild.id}.starboards.${name}.messages.${msg.id}`);
      }
    }
  } catch (error) {
    console.error('Starboard reaction remove error:', error);
  }
}
