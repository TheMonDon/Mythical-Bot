const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class Emoji extends Command {
  constructor(client) {
    super(client, {
      name: 'emoji',
      description: 'Create, edit, or get information about an emoji',
      usage: 'emoji <create | delete | info | rename> <name | emoji> [name | image | attachment]',
      category: 'Moderator',
      permLevel: 'Moderator',
      examples: [
        'emoji create <name> <image | attachment>',
        'emoji delete <emoji>',
        'emoji info <emoji>',
        'emoji rename <emoji> <name>',
      ],
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

    if (type !== 'info') {
      if (!msg.guild.members.me.permissions.has('ManageGuildExpressions')) {
        return msg.channel.send('The bot is missing Manage Expressions permission');
      }
    }

    switch (type) {
      case 'create': {
        const name = args[1];
        const image = msg.attachments.first()?.url || args[2];
        if (!image) return this.client.util.errorEmbed(msg, 'Please provide a valid image.');

        const emoji = await msg.guild.emojis.create({ attachment: image, name }).catch((error) => {
          return this.client.util.errorEmbed(msg, error);
        });
        return msg.channel.send(`${emoji} has been created.`);
      }
      case 'delete': {
        const emoji = args[1];
        const result = guildEmoji(msg, emoji);

        if (!result) return this.client.util.errorEmbed(msg, 'That emoji was not found.');
        if (!result.deletable) return this.client.util.errorEmbed(msg, 'That emoji is not deletable by the bot.');

        result.delete();
        return msg.channel.send('The emoji has been successfully deleted.');
      }
      case 'info': {
        const emoji = args[1];
        const result = guildEmoji(msg, emoji);
        if (!result) return this.client.util.errorEmbed(msg, 'That emoji was not found.');
        await result.fetchAuthor();

        const em = new EmbedBuilder()
          .setTitle('Emoji Information')
          .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
          .setColor(msg.settings.embedColor)
          .addFields([
            { name: 'Emoji', value: result.toString(), inline: true },
            { name: 'Name', value: result.name, inline: true },
            { name: 'Author', value: result.author?.toString() || 'Unknown', inline: true },
            { name: 'Is Animated?', value: result.animated ? 'True' : 'False', inline: true },
            { name: 'is Available?', value: result.available ? 'True' : 'False', inline: true },
            { name: 'is Deletable?', value: result.deletable ? 'True' : 'False', inline: true },
            { name: 'ID', value: result.id.toString(), inline: true },
            { name: 'Created At', value: result.createdAt.toString() || 'Unknown', inline: true },
          ]);

        return msg.channel.send({ embeds: [em] });
      }
      case 'rename': {
        const emoji = args[1];
        const name = args[2];
        const result = guildEmoji(msg, emoji);
        if (!result) return this.client.util.errorEmbed(msg, 'That emoji was not found.');

        result
          .edit({ name })
          .then(() => {
            return msg.reply(`${result} has been renamed to \`${name}\``);
          })
          .catch((error) => {
            return this.client.util.errorEmbed(msg, error);
          });
        break;
      }
      default: {
        return msg.channel.send(usage);
      }
    }

    function guildEmoji(message, emoji) {
      let result;

      let guildEmojis = emoji.match(/:[_a-zA-Z0-9]*>/g);
      if (guildEmojis) {
        guildEmojis = guildEmojis.map((e) => e.substring(1, e.length - 1));
        const guildEmoji = message.guild.emojis.cache.get(guildEmojis[0]);
        if (guildEmoji) result = guildEmoji;
      } else {
        const guildEmoji = message.guild.emojis.cache.find((e) => e.name === emoji);
        if (guildEmoji) result = guildEmoji;
      }

      return result;
    }
  }
}

module.exports = Emoji;
