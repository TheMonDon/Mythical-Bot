import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, messageReaction, user) {
  if (user?.bot) return;
  if (!messageReaction) return;
  const msg = messageReaction.message;

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

      const threshold = config.threshold || 3;
      const stars = messageReaction.count;

      const existingStarMsg = await db.get(`servers.${msg.guild.id}.starboards.${name}.messages.${msg.id}`);
      if (!existingStarMsg) continue;

      const starMessage = await starChannel.messages.fetch(existingStarMsg).catch(() => null);
      if (starMessage) {
        if (stars < threshold) {
          await starMessage.delete().catch(() => null);
          await db.delete(`servers.${msg.guild.id}.starboards.${name}.messages.${msg.id}`);
          continue;
        }

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

        await starMessage.edit({ content, embeds }).catch(() => null);
      }
    }
  }
}
