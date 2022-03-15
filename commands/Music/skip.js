const Command = require('../../base/Command.js');
const { MessageEmbed } = require('discord.js');

class Skip extends Command {
  constructor (client) {
    super(client, {
      name: 'skip',
      description: 'Skip the current song',
      category: 'Music',
      usage: 'skip',
      aliases: ['next'],
      guildOnly: true
    });
  }

  async run (msg) {
    const queue = this.client.player.getQueue(msg.guild);

    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to skip music.');
    if (msg.guild.me.voice.channel && msg.member.voice.channel.id !== msg.guild.me.voice.channel.id) return msg.channel.send('You must be in the same voice channel as the bot.');
    if (!queue.nowPlaying()) return msg.channel.send('There is nothing playing.');

    const song = queue.nowPlaying();
    queue.skip();

    const em = new MessageEmbed()
      .setColor('GREEN')
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .addField('Skipped Song', song.title, false);

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Skip;
