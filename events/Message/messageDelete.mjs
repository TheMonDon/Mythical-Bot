import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, message) {
  if (message.author.bot) return;
  if (!message.guild) return;

  const logChan = await db.get(`servers.${message.guild.id}.logs.channel`);
  if (!logChan) return;

  const logSys = await db.get(`servers.${message.guild.id}.logs.logSystem.message-deleted`);
  if (logSys !== 'enabled') return;

  const chans = (await db.get(`servers.${message.guild.id}.logs.noLogChans`)) || [];
  if (chans.includes(message.channel.id)) return;

  // Check if a game is being played by message author (hangman, connect4, etc)
  const current = client.games.get(message.channel.id);
  if (current && ['connect4', 'hangman', 'wordle'].includes(current.name) && current.user === message.author.id) return;

  let delby;
  if (message.guild.members.me.permissions.has('ViewAuditLog')) {
    message.guild
      .fetchAuditLogs()
      .then((audit) => {
        delby = audit.entries.first().executor;
      })
      .catch(console.error);
  }

  try {
    const authorName = message.author.discriminator === '0' ? message.author.username : message.author.tag;
    const embed = new EmbedBuilder()
      .setTitle('Message Deleted')
      .setColor('#FF0000')
      .setAuthor({ name: authorName, iconURL: message.author.displayAvatarURL() })
      .setThumbnail(message.author.displayAvatarURL())
      .addFields([
        { name: 'Channel', value: `<#${message.channel.id}>` },
        { name: 'Message Author', value: `${message.author} (${authorName})` },
      ])
      .setFooter({ text: `Message ID: ${message.id}` })
      .setTimestamp();

    if (message.content) embed.setDescription(`**Content:**\n${message.content}`);
    if (message.attachments?.size > 0) {
      const attachmentString = message.attachments.map((attachment) => `[${attachment.name}](${attachment.url})\n`);
      embed.addFields([{ name: 'Attachments', value: attachmentString.join('').slice(0, 1_024) }]);
    }

    if (message.stickers?.size > 0) {
      const stickerString = message.stickers.map((sticker) => `[${sticker.name}](${sticker.url})\n`);
      embed.addFields([{ name: 'Stickers', value: stickerString.join('').slice(0, 1_024) }]);
    }

    if (delby && message.author !== delby) embed.addFields([{ name: 'Deleted By', value: delby }]);
    if (message.mentions.users.size >= 1)
      embed.addFields([{ name: 'Mentioned Users', value: `${[...message.mentions.users.values()]}` }]);

    message.guild.channels.cache
      .get(logChan)
      .send({ embeds: [embed] })
      .catch(() => {});

    await db.add(`servers.${message.guild.id}.logs.message-deleted`, 1);
    await db.add(`servers.${message.guild.id}.logs.all`, 1);
  } catch (err) {
    client.logger.error(err);
  }
}
