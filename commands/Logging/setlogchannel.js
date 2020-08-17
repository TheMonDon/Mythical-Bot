const Command = require('../../base/Command.js');
const Discord = require('discord.js');
const db = require('quick.db');

class setlogchannel extends Command {
  constructor (client) {
    super(client, {
      name: 'setlogchannel',
      description: 'Set the log channel',
      usage: 'setlogchannel <channel>',
      category: 'Logging',
      permLevel: 'Moderator'
    });
  }

  async run (msg, args) { // eslint-disable-line no-unused-vars
    const embed = new Discord.MessageEmbed();
    const server = msg.guild;

    const log_system = {
      'channel-created': 'enabled',
      'channel-deleted': 'enabled',
      'channel-updated': 'enabled',
      'member-join': 'enabled',
      'member-leave': 'enabled',
      'message-deleted': 'enabled',
      'message-edited': 'enabled',
      'role-created': 'enabled',
      'role-deleted': 'enabled',
      'role-updated': 'enabled',
      'v-channel-created': 'enabled',
      'v-channel-deleted': 'enabled',
      'emoji-created': 'enabled',
      'emoji-deleted': 'enabled',
      'all': 'enabled'
    };

    const text = args.join(' ');
    if (!text || text.length < 1) {
      return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}setlogchannel <channel>`);
    }
    const chan = msg.mentions.channels.first() || server.channels.find(c => c.id === text) ||
    server.channels.find(c => c.name.toLowerCase() === text.toLowerCase()) ||
    server.channels.find(c => c.name.toLowerCase().includes(text.toLowerCase())); 

    if (!chan) return msg.channel.send('Please provide a valid server channel.');
    const currentChan = db.get(`servers.${msg.guild.id}.logs.channel`);

    if (currentChan) {
      embed.setTitle('Sucessfully Changed');
      embed.setColor('GREEN');
      embed.setThumbnail('https://cdn.discordapp.com/emojis/482184108555108358.png');
      embed.setDescription(`Everything related to logs will be posted in ${chan} from now on.`);
      embed.setTimestamp();
      msg.channel.send(embed);
    } else {
      db.set(`servers.${msg.guild.id}.logs.log_system`, log_system);
      embed.setTitle('Sucessfully Set');
      embed.setColor('GREEN');
      embed.setThumbnail('https://cdn.discordapp.com/emojis/482184108555108358.png');
      embed.setDescription(`Everything related to logs will be posted in ${chan}.`);
      embed.setTimestamp();
      msg.channel.send(embed);
    }
  }
}

module.exports = setlogchannel;