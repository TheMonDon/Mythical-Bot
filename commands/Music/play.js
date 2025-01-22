const Command = require('../../base/Command.js');
const { useMainPlayer } = require('discord-player');

class Play extends Command {
  constructor(client) {
    super(client, {
      name: 'play',
      description: 'Play music or add songs to the queue',
      longDescription: 'Supports youtube search/links, youtube playlist, and spotify playlists.',
      category: 'Music',
      usage: 'play <song>',
      aliases: ['p'],
      examples: ['play unsweetened lemonade'],
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const player = useMainPlayer();

    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to play music.');
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id)
      return msg.channel.send('You have to be in the same voice channel as the bot to play music');

    const query = args.join(' ').slice(0, 300);

    try {
      const { track } = await player.play(msg.member.voice.channel, query, {
        requestedBy: msg.author,
        nodeOptions: {
          metadata: msg,
          selfDeaf: true,
          leaveOnStop: true,
          leaveOnEnd: false,
          leaveOnEmpty: false,
        },
      });

      if (!track) return msg.channel.send('No tracks found.');
    } catch (e) {
      return msg.channel.send(`Something went wrong: \`${e}\``);
    }
  }
}

module.exports = Play;
