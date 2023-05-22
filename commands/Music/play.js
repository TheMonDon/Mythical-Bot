const Command = require('../../base/Command.js');

class Play extends Command {
  constructor (client) {
    super(client, {
      name: 'play',
      description: 'Play music or add songs to the queue',
      longDescription: 'Supports youtube search/links, youtube playlist, and spotify playlists.',
      category: 'Music',
      usage: 'play <song>',
      aliases: ['p'],
      guildOnly: true
    });
  }

  async run (msg, args) {
    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to play music.');
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id) return msg.channel.send('You have to be in the same voice channel as the bot to play music');

    const query = args.join(' ').slice(0, 300);
    if (!query) return msg.channel.send('Please enter something to search for.');

    const searchResult = await this.client.player.search(query, { requestedBy: msg.author });

    if (!searchResult.hasTracks()) {
      // If player didn't find any songs for this query
      return msg.channel.send(`We couldn't find any tracks for ${query}!`);
    }

    try {
      await this.client.player.play(msg.member.voice.channel, searchResult, {
        nodeOptions: {
          metadata: msg,
          selfDead: true,
          leaveOnStop: true,
          leaveOnEnd: false,
          leaveOnEmpty: false
        }
      });
    } catch (e) {
      return msg.channel.send(`Something went wrong: ${e}`);
    }
  }
}

module.exports = Play;
