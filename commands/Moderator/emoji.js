const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const { EmbedBuilder } = require('discord.js');

class Emoji extends Command {
  constructor (client) {
    super(client, {
      name: 'emoji',
      description: 'Sends the image of the provided emojis',
      usage: 'emoji <create | delete | info | rename> <name | emoji> [<name | image>]',
      category: 'Moderator',
      permLevel: 'Moderator',
      longDescription: stripIndents`
      \`emoji create <name> <image>\`
      \`emoji delete <emoji>\`
      \`emoji info <emoji>\`
      \`emoji rename <emoji> <name>\`
    `
    });
  }

  async run (msg, args) {
    const usage = `
Incorrect Usage:
\`${msg.settings.prefix}emoji create <name> <image | attachment>\`
\`${msg.settings.prefix}emoji delete <emoji>\`
\`${msg.settings.prefix}emoji info <emoji>\`
\`${msg.settings.prefix}emoji rename <emoji> <name>\`
    `;
    if (!args || args.length < 2) return msg.reply(usage);

    const type = args[0].toLowerCase();

    if (type === 'create') {
      const name = args[1];
      const image = msg.attachments.first()?.url || args[2];
      if (!image) return msg.reply('Please provide a valid image');

      const emoji = await msg.guild.emojis.create(image, name);
      return msg.reply(`${emoji} has been created.`);
    } else if (type === 'delete') {
      const emoji = args[1];
      let result;

      // Guild emojis
      let guildEmojis = emoji.match(/:[_a-zA-Z0-9]*>/g);
      if (guildEmojis) {
        guildEmojis = guildEmojis.map(e => e.substring(1, e.length - 1));
        const guildEmoji = msg.guild.emojis.cache.get(guildEmojis[0]);
        if (guildEmoji) result = guildEmoji;
      } else {
        const guildEmoji = msg.guild.emojis.cache.find(e => e.name === emoji);
        if (guildEmoji) result = guildEmoji;
      }

      if (!result) return msg.reply('That emoji was not found. Is it from this server?');
      if (!result.deletable) return msg.reply('That emoji is not deletable.');

      result.delete();
      return msg.reply('The emoji has been successfully deleted.');
    } else if (type === 'info') {
      const emoji = args[1];
      let result;

      // Guild emojis
      let guildEmojis = emoji.match(/:[_a-zA-Z0-9]*>/g);
      if (guildEmojis) {
        guildEmojis = guildEmojis.map(e => e.substring(1, e.length - 1));
        const guildEmoji = msg.guild.emojis.cache.get(guildEmojis[0]);
        if (guildEmoji) result = guildEmoji;
      } else {
        const guildEmoji = msg.guild.emojis.cache.find(e => e.name === emoji);
        if (guildEmoji) result = guildEmoji;
      }

      if (!result) return msg.reply('That emoji was not found. Is it from this server?');

      const em = new EmbedBuilder()
        .setTitle('Emoji Information')
        .addFields([
          { name: 'Emoji', value: result.toString() },
          { name: 'Emoji Name', value: result.name },
          { name: 'Is Animated?', value: result.animated.toString() },
          { name: 'Emoji ID', value: result.id.toString() },
          { name: 'Emoji is Available?', value: result.available.toString() },
          { name: 'Emoji Author', value: result.author?.toString() || 'N/A' }
        ]);

      return msg.channel.send({ embeds: [em] });
    } else if (type === 'rename') {
      const emoji = args[1];
      const name = args[2];
      let result;

      // Guild emojis
      let guildEmojis = emoji.match(/:[_a-zA-Z0-9]*>/g);
      if (guildEmojis) {
        guildEmojis = guildEmojis.map(e => e.substring(1, e.length - 1));
        const guildEmoji = msg.guild.emojis.cache.get(guildEmojis[0]);
        if (guildEmoji) result = guildEmoji;
      } else {
        const guildEmoji = msg.guild.emojis.cache.find(e => e.name === emoji);
        if (guildEmoji) result = guildEmoji;
      }

      if (!result) return msg.reply('That emoji was not found. Is it from this server?');

      result.edit({ name })
        .then(() => {
          return msg.reply(`${result} has been renamed to \`${name}\``);
        })
        .catch(e => {
          return msg.reply(`An error occurred: ${e}`);
        });
    } else {
      return msg.reply(usage);
    }
  }
}

module.exports = Emoji;
