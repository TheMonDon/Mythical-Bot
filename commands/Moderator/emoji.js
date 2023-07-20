const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class Emoji extends Command {
  constructor(client) {
    super(client, {
      name: 'emoji',
      description: 'Sends the image of the provided emojis',
      usage: 'emoji <create | delete | info | rename> <name | emoji> [name | image | attachment]',
      category: 'Moderator',
      permLevel: 'Moderator',
      examples: ['emoji create <name> <image | attachment>', 'emoji delete <emoji>', 'emoji info <emoji>', 'emoji rename <emoji> <name>'],
      requiredArgs: 2,
    });
  }

  async run(msg, args) {
    const usage = `
Incorrect Usage:
\`${msg.settings.prefix}emoji create <name> <image | attachment>\`
\`${msg.settings.prefix}emoji delete <emoji>\`
\`${msg.settings.prefix}emoji info <emoji>\`
\`${msg.settings.prefix}emoji rename <emoji> <name>\`
    `;

    const type = args[0].toLowerCase();

    if (type === 'create') {
      const name = args[1];
      const image = msg.attachments.first()?.url || args[2];
      if (!image) return msg.reply('Please provide a valid image');

      const emoji = await msg.guild.emojis.create({ attachment: image, name});
      return msg.reply(`${emoji} has been created.`);
    } else if (type === 'delete') {
      const emoji = args[1];
      let result;

      // Guild emojis
      let guildEmojis = emoji.match(/:[_a-zA-Z0-9]*>/g);
      if (guildEmojis) {
        guildEmojis = guildEmojis.map((e) => e.substring(1, e.length - 1));
        const guildEmoji = msg.guild.emojis.cache.get(guildEmojis[0]);
        if (guildEmoji) result = guildEmoji;
      } else {
        const guildEmoji = msg.guild.emojis.cache.find((e) => e.name === emoji);
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
        guildEmojis = guildEmojis.map((e) => e.substring(1, e.length - 1));
        const guildEmoji = msg.guild.emojis.cache.get(guildEmojis[0]);
        if (guildEmoji) result = guildEmoji;
      } else {
        const guildEmoji = msg.guild.emojis.cache.find((e) => e.name === emoji);
        if (guildEmoji) result = guildEmoji;
      }

      if (!result) return msg.reply('That emoji was not found. Is it from this server?');

      const em = new EmbedBuilder().setTitle('Emoji Information').addFields([
        { name: 'Emoji', value: result.toString(), inline: true },
        { name: 'Name', value: result.name, inline: true },
        { name: 'Is Animated?', value: result.animated.toString(), inline: true },
        { name: 'ID', value: result.id.toString(), inline: true },
        { name: 'is Available?', value: result.available.toString(), inline: true },
        { name: 'Author', value: result.author?.toString() || 'Unknown', inline: true },
        { name: 'is Deleteable?', value: result.deletable.toString(), inline: true },
        { name: 'Created At', value: result.createdAt.toString() || 'Unknown', inline: true },
      ]);

      return msg.channel.send({ embeds: [em] });
    } else if (type === 'rename') {
      const emoji = args[1];
      const name = args[2];
      let result;

      // Guild emojis
      let guildEmojis = emoji.match(/:[_a-zA-Z0-9]*>/g);
      if (guildEmojis) {
        guildEmojis = guildEmojis.map((e) => e.substring(1, e.length - 1));
        const guildEmoji = msg.guild.emojis.cache.get(guildEmojis[0]);
        if (guildEmoji) result = guildEmoji;
      } else {
        const guildEmoji = msg.guild.emojis.cache.find((e) => e.name === emoji);
        if (guildEmoji) result = guildEmoji;
      }

      if (!result) return msg.reply('That emoji was not found. Is it from this server?');

      result
        .edit({ name })
        .then(() => {
          return msg.reply(`${result} has been renamed to \`${name}\``);
        })
        .catch((e) => {
          return msg.reply(`An error occurred: ${e}`);
        });
    } else {
      return msg.reply(usage);
    }
  }
}

module.exports = Emoji;
