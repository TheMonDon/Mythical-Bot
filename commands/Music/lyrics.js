const Command = require('../../base/Command.js');
const lf = require('lyrics-finder');
const { EmbedBuilder } = require('discord.js');

class Lyrics extends Command {
  constructor (client) {
    super(client, {
      name: 'lyrics',
      description: 'Find the lyrics of a song',
      category: 'Music',
      usage: 'lyrics [song]'
    });
  }

  async run (msg, args) {
    let song;
    const queue = this.client.player.getQueue(msg.guild);

    if (!args || args.length < 1) {
      if (!msg.guild) return msg.channel.send('I can\'t get the lyrics of nothing.');
      const playing = queue.nowPlaying();
      song = playing?.title;
      if (!song) return msg.channel.send('I can\'t get the lyrics of nothing.');
    } else {
      song = args.join(' ').slice(0, 300);
    }

    song = song.replace(/\(lyrics|lyric|official music video|audio|official|official video|official video hd|clip official|clip|extended|hq\)/g, '');
    const lyrics = await lf(song, '');
    if (!lyrics) return msg.channel.send(`No lyrics found for: ${song}`);

    let emLyrics = lyrics;
    if (emLyrics.length > 3090) emLyrics = lyrics.slice(0, 3090) + '...';

    const em = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .setDescription(`\`\`\`${emLyrics}\`\`\``);
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Lyrics;
