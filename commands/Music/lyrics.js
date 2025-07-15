const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

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
    const player = this.client.lavalink.getPlayer(msg.guild.id);

    if (!args || args.length < 1) {
      if (!msg.guild) return this.client.util.errorEmbed(msg, "I can't get the lyrics of nothing.");
      const playing = player?.queue.current;
      song = `${playing?.info.author} ${playing?.info.title}`;
      if (!playing || song === ' ')
        return this.client.util.errorEmbed(msg, 'Nothing is playing, please try again with a song name.');
    } else {
      song = args.join(' ').slice(0, 300);
    }

    const Genius = require('genius-lyrics');
    const Client = new Genius.Client();

    const searches = await Client.songs.search(song);
    const firstSong = searches[0];
    const lyrics = await firstSong.lyrics();

    if (!lyrics) return msg.channel.send(`No lyrics found for: \`${song}\``);
    function cleanLyrics(rawText) {
      return rawText.replace(/^[\s\S]*?Read More\s*/i, '');
    }

    const trimmedLyrics = this.client.util.limitStringLength(cleanLyrics(lyrics), 0, 4096);

    const em = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setTitle(firstSong.fullTitle)
      .setURL(firstSong.url)
      .setDescription(trimmedLyrics);
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Lyrics;
