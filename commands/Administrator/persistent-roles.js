const Command = require('../../base/Command.js');
const db = require('quick.db');

class persistentRoles extends Command {
  constructor(client) {
    super(client, {
      name: 'persistent-roles',
      description: 'Enable/Disable the persistent roles system for your guild.',
      category: 'Administrator',
      usage: 'persistent-roles',
      aliases: ['pr', 'proles'],
      permLevel: 'Administrator',
      guildOnly: true
    });
  }

  async run(msg) {
    if (!msg.guild.me.permissions.has('MANAGE_ROLES')) return msg.channel.send('The bot requires the Manage_Roles permission for this to work.');

    const working = false;
    if (!working) {
      return msg.channel.send('This command does not work yet.');
    }

    const toggle = db.get(`servers.${msg.guild.id}.proles.system`) || false;

    if (toggle === true) {
      msg.channel.send('disabled')
    } else {
      msg.channel.send('enabled')
    }
  }
}

module.exports = persistentRoles;
