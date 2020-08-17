const Command = require('../../base/Command.js');

class Loop extends Command {
  constructor (client) {
    super(client, {
      name: 'loop',
      description: 'Loop the current song',
      category: 'Music',
      usage: 'loop <on/off>',
      guildOnly: true
    });
  }

  async run (msg, args) {
    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to loop music.');
    if (msg.guild.me.voice.channel && msg.member.voice.channel.id !== msg.guild.me.voice.channel.id) return msg.channel.send('You must be in the same voice channel as the bot.');
    if (!this.client.player.isPlaying(msg.guild.id)) return msg.channel.send('There is nothing playing.');

    const of = ['on', 'off'];
    const text = args.join(' ').toLowerCase();
    if (!of.includes(text)) return msg.channel.send('Incorrect usage: loop <on/off>');
    if (text === 'on') {
      this.client.player.setRepeatMode(msg.guild.id, true);
      const song = await this.client.player.nowPlaying(msg.guild.id);
      return msg.channel.send(`Now Repeating: ${song.name}`);
    }
    if (text === 'off') {
      this.client.player.setRepeatMode(msg.guild.id, false);
      const song = await this.client.player.nowPlaying(msg.guild.id);
      return msg.channel.send(`Stopped Repeating: ${song.name}`);
    }

  }
}

module.exports = Loop;
