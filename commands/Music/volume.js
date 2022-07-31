const Command = require('../../base/Command.js');
const db = require('quick.db');

class Volume extends Command {
  constructor (client) {
    super(client, {
      name: 'volume',
      description: 'Change the volume of the music',
      category: 'Music',
      usage: 'volume',
      aliases: ['vol', 'v'],
      guildOnly: true
    });
  }

  async run (msg, args) {
    const premium = db.get(`servers.${msg.guild.id}.premium`) || false;
    if (!premium) return msg.channel.send('Sorry, this is a beta command and requires the server to have premium status. \nContact TheMonDon#1721 for premium.');

    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to change the volume.');
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id) return msg.channel.send('You must be in the same voice channel as the bot.');
    if (!this.client.player.getQueue(msg.guild).playing) return msg.channel.send('There is nothing playing.');

    const volume = parseInt(args.join(' '), 10);

    if (!volume) return msg.channel.send('Please enter a valid number.');
    if (isNaN(args[0])) return msg.channel.send('Please enter a valid number.');
    if (volume < 1 || volume > 100) return msg.channel.send('The volume must be between 1 and 100.');
    this.client.player.setVolume(msg, volume);
    return msg.channel.send(`The volume has been set to: ${volume}`);
  }
}

module.exports = Volume;
