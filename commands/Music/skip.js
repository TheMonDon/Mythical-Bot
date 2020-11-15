const Command = require('../../base/Command.js');
const { MessageEmbed } = require('discord.js');

class Skip extends Command {
  constructor (client) {
    super(client, {
      name: 'skip',
      description: 'Skip the current song',
      category: 'Music',
      usage: 'skip',
      guildOnly: true
    });
  }

  async run (msg) {
    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to skip music.');
    if (msg.guild.me.voice.channel && msg.member.voice.channel.id !== msg.guild.me.voice.channel.id) return msg.channel.send('You must be in the same voice channel as the bot.');
    if (!this.client.player.isPlaying(msg)) return msg.channel.send('There is nothing playing.');
    const song = await this.client.player.skip(msg);

    const em = new MessageEmbed()
      .addField('Skipped Song', song.tracks[0].title, false)
      .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
      .setColor('GREEN');
    return msg.channel.send(em);
  }
}

module.exports = Skip;
