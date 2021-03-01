const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const DiscordJS = require('discord.js');

class Emoji extends Command {
  constructor (client) {
    super(client, {
      name: 'emoji',
      description: 'Sends the image of the provided emojis',
      usage: 'emoji <create | delete | info | rename> <...>',
      category: 'Moderator',
      permLevel: 'Moderator',
      aliases: ['dl', 'downloademoji', 'dlemoji'],
      longDescription: stripIndents`
      \`emoji create <name> <image>\`
      \`emoji delete <emoji>\`
      \`emoji info <emoji>\`
      \`emoji rename <emoji> <name>\`
    `
    });
  }

  async run (msg, args) {
    const p = msg.settings.prefix;
    const usage = stripIndents`
      Incorrect Usage:
      \`${p}emoji create <name> <image>\`
      \`${p}emoji delete <emoji>\`
      \`${p}emoji info <emoji>\`
      \`${p}emoji rename <emoji> <name>\`
    `;
    if (!args || args.length < 2) return msg.channel.send(usage);

    const type = args[0].toLowerCase();

    if (type === 'create') {
      const name = args[1];
      let image;

      if (msg.attachments.first()) {
        image = msg.attachments.first().url;
      } else {
        image = args[2];
      }
      const emoji = await msg.guild.emojis.create(image, name);
      return msg.channel.send(`${msg.member}, ${emoji} has been created.`);
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
      if (!result) return msg.channel.send(`${msg.member}, that emoji was not found. Is it from this server?`);
      if (!result.deletable) return msg.channel.send('That emoji is not deletable.');
      result.delete();
      return msg.channel.send(`${msg.member}, the emoji has been succesfully deleted.`);
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
      if (!result) return msg.channel.send(`${msg.member}, that emoji was not found. Is it from this server?`);
      const em = new DiscordJS.MessageEmbed()
        .setTitle('Emoji Information')
        .addField('Emoji', result, true)
        .addField('Emoji Name', result.name, true)
        .addField('Is Animated?', result.animated, true)
        .addField('Emoji ID', result.id, true)
        .addField('Emoji is Available?', result.available, true)
        .addField('Emoji Author', result.author || 'N/A', true);
      return msg.channel.send(em);
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
      if (!result) return msg.channel.send(`${msg.member}, that emoji was not found. Is it from this server?`);
      result.edit({ name: name })
        .then(() => {
          return msg.channel.send(`${msg.member}, ${result} has been renamed to \`${name}\``);
        })
        .catch(e => {
          return msg.channel.send(`An error occured: ${e}`);
        });
    } else {
      return msg.channel.send(usage);
    }
  }
}
module.exports = Emoji;
