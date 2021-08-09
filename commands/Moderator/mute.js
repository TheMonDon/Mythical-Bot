const Command = require('../../base/Command.js');
const { getMember } = require('../../base/Util.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');
const moment = require('moment');

class Mute extends Command {
  constructor (client) {
    super(client, {
      name: 'mute',
      description: 'View the information of a specific case.',
      usage: 'mute <user> <time> <reason>',
      category: 'Moderator',
      permLevel: 'Moderator',
      enabled: false
    });
  }

  async run (msg, args) {
    const logChan = db.get(`servers.${msg.guild.id}.logging.channel`);
    const roleName = db.get(`servers.${msg.guild.id}.mutes.role`) || 'Muted';

    if (!args[0]) return msg.channel.send('Please provide a user and a reason.');
    const muteMem = getMember(msg, args[0]);

    let role = msg.guild.roles.cache.find(m => m.name === roleName);
    if (!role) {
      role = await msg.guild.roles.create({
        data: {
          name: 'Muted',
          color: '#000000'
        },
        reason: 'Create mute system role'
      });

      msg.guild.channels.forEach(async (channel, id) => {
        await channel.overwritePermissions({
          id: role.id,
          deny: ['SEND_MESSAGES', 'ADD_REACTIONS']

        });
      });
    }
  }
}

module.exports = Mute;
