const Command = require('../../base/Command.js');
const { getMember } = require('../../util/Util.js');
const db = require('quick.db');

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
    // eslint-disable-next-line no-unused-vars
    const logChan = db.get(`servers.${msg.guild.id}.logging.channel`);
    const roleName = db.get(`servers.${msg.guild.id}.mutes.role`) || 'Muted';
    const usage = `Incorrect Usage: ${msg.settings.prefix}mute <user> <time> <reason>`;

    if (!args || args.length < 1) return msg.reply(usage);

    const muteMem = getMember(msg, args[0]);
    if (!muteMem) return msg.channel.send('Please specify a valid user.');

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
          deny: ['SendMessages', 'AddReactions']
        });
      });
    }
  }
}

module.exports = Mute;
