const Command = require('../../base/Command.js');
const { MessageEmbed } = require('discord.js');

class Back extends Command {
  constructor (client) {
    super(client, {
      name: 'back',
      description: 'Go back to the last song.',
      category: 'Music',
      usage: 'back',
      aliases: ['previous'],
      guildOnly: true
    });
  }

  async run (msg) {
    const queue = this.client.player.getQueue(msg.guild);

    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to skip music.');
    if (msg.guild.me.voice.channel && msg.member.voice.channel.id !== msg.guild.me.voice.channel.id) return msg.channel.send('You must be in the same voice channel as the bot.');
    if (!queue.nowPlaying()) return msg.channel.send('There is nothing playing.');

    await queue.back(msg);
    const song = queue.nowPlaying();

    const em = new MessageEmbed()
      .setColor('GREEN')
      .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
      .addField('Now Playing', song.title, false);

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Back;
