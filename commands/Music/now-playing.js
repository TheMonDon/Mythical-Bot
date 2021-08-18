const Command = require('../../base/Command.js');
const { MessageEmbed } = require('discord.js');
const { stripIndents } = require('common-tags');
const moment = require('moment');
require('moment-duration-format');

class NowPlaying extends Command {
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
    if (!this.client.player.getQueue(msg.guild.id).playing) return msg.channel.send('There is nothing playing.');
    const song = await this.client.player.nowPlaying(msg);

    const queue = this.client.player.getQueue(msg);

    let songTime = `00:${song.duration}`;
    if (song.duration.match(/(:)/g)?.length === 2) songTime = song.duration;
    let duration = moment.duration(songTime).asSeconds() * 1000;
    let timeLeft = moment.duration(duration - queue.currentStreamTime).format('d [days,] h [hours,] m [minutes,] s [seconds]');

    let loop;
    while (timeLeft.startsWith('-') && loop < 3) {
      loop += 1;
      songTime = songTime.startsWith('00') ? `${song.duration}:00` : `${songTime}:00`;
      duration = moment.duration(songTime).asSeconds() * 1000;
      timeLeft = moment.duration(duration - queue.currentStreamTime).format('d [days,] h [hours,] m [minutes,] s [seconds]');
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
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = NowPlaying;
