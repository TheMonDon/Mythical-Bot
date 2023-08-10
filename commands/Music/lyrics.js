const { lyricsExtractor } = require('@discord-player/extractor');
const Command = require('../../base/Command.js');
const { useQueue } = require('discord-player');
const { EmbedBuilder } = require('discord.js');
const lyricsFinder = lyricsExtractor();

class Lyrics extends Command {
  constructor(client) {
    super(client, {
      name: 'lyrics',
      description: 'Find the lyrics of a song',
      category: 'Music',
      usage: 'lyrics [song]',
    });
  }

  async run(msg, args) {
    let song;
    const queue = useQueue(msg.guild.id);

    if (!args || args.length < 1) {
      if (!msg.guild) return this.client.util.errorEmbed("I can't get the lyrics of nothing.");
      const playing = queue.currentTrack;
      song = `${playing?.author} ${playing?.title}`;
      if (!song) return this.client.util.errorEmbed('Nothing is playing, please try again with a song name.');
    } else {
      song = args.join(' ').slice(0, 300);
    }

    const lyrics = await lyricsFinder.search(song).catch(() => null);
    if (!lyrics) return msg.channel.send(`No lyrics found for: ${song}`);
    const trimmedLyrics = lyrics.lyrics.substring(0, 3097);

    const em = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setAuthor({ name: lyrics.artist.name, iconURL: lyrics.artist.image, url: lyrics.artist.url })
      .setTitle(lyrics.title)
      .setURL(lyrics.url)
      .setThumbnail(lyrics.thumbnail)
      .setDescription(trimmedLyrics.length === 3090 ? `${trimmedLyrics}...` : trimmedLyrics);
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Lyrics;
