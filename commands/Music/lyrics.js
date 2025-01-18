const Command = require('../../base/Command.js');
const { useQueue } = require('discord-player');
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
    const queue = useQueue(msg.guild.id);

    if (!args || args.length < 1) {
      if (!msg.guild) return this.client.util.errorEmbed(msg, "I can't get the lyrics of nothing.");
      const playing = queue?.currentTrack;
      song = `${playing?.author} ${playing?.title}`;
      if (!playing || song === ' ')
        return this.client.util.errorEmbed(msg, 'Nothing is playing, please try again with a song name.');
    } else {
      song = args.join(' ').slice(0, 300);
    }

    const lyrics = await this.client.player.lyrics.search({ q: song }).catch(() => null);
    if (!lyrics[0]) return msg.channel.send(`No lyrics found for: \`${song}\``);
    const trimmedLyrics = this.client.util.limitStringLength(lyrics[0].plainLyrics, 0, 4096);

    const em = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .setTitle(lyrics[0].trackName)
      .setDescription(trimmedLyrics);
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Lyrics;
