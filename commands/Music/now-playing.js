const Command = require('../../base/Command.js');

class NowPlaying extends Command {
  constructor(client) {
    super(client, {
      name: 'now-playing',
      description: 'Shows what is currently playing',
      category: 'Music',
      usage: 'now-playing',
      aliases: ['np', 'nowplaying'],
      guildOnly: true,
    });
  }

  async run(msg) {
    const player = this.client.lavalink.getPlayer(msg.guild.id);
    const song = player?.queue.current;

    if (!song) {
      return this.client.util.errorEmbed(msg, 'There is nothing playing.');
    }

    const requester = msg.guild.members.cache.get(song.requester.id);
    const buffer = await this.client.util.generateNowPlayingCard({ player, song, requester });

    return msg.channel.send({ files: [{ attachment: buffer, name: 'now-playing.png' }] });
  }
}

module.exports = NowPlaying;
