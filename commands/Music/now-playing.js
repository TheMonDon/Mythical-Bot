const Command = require('../../base/Command.js');
const { MessageEmbed } = require('discord.js');
const { stripIndents } = require('common-tags');
const moment = require('moment');
require('moment-duration-format');

class nowPlaying extends Command {
  constructor (client) {
    super(client, {
      name: 'now-playing',
      description: 'Shows what is currently playing',
      category: 'Music',
      usage: 'now-playing',
      aliases: ['np', 'nowplaying'],
      guildOnly: true
    });
  }

  async run (msg) {
    if (!this.client.player.isPlaying(msg)) return msg.channel.send('There is nothing playing.');
    const song = await this.client.player.nowPlaying(msg);

    const queue = this.client.player.getQueue(msg);

    let songTime = song.duration;
    let duration = moment.duration('00:' + songTime).asSeconds() * 1000;
    const totalTime = queue.currentStreamTime;
    let timeLeft = moment.duration(duration - totalTime).format('d [days,] h [hours,] m [minutes,] s [seconds]');

    while (timeLeft.startsWith('-')) {
      songTime = `${songTime}:00`;
      duration = moment.duration(songTime).asSeconds() * 1000;
      timeLeft = moment.duration(duration - totalTime).format('d [days,] h [hours,] m [minutes,] s [seconds]');
    }

    const em = new MessageEmbed()
      .setDescription(stripIndents`
        Now ${queue.paused ? 'Paused' : 'Playing'} ♪: [${song.title}](${song.url})

        Duration: ${moment.duration(songTime).format('d [days,] h [hours,] m [minutes,] s [seconds]')}
        Time Remaining: ${timeLeft}
        ${this.client.player.createProgressBar(msg)}

        Requested By: ${song.requestedBy}
    `)
      .setColor('0099CC')
      .setThumbnail(song.thumbnail)
      .setAuthor(msg.member.displayName, msg.author.displayAvatarURL());
    return msg.channel.send(em);
  }
}

module.exports = nowPlaying;
