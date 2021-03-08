const Command = require('../../base/Command.js');
const db = require('quick.db');

class persistentRoles extends Command {
  constructor (client) {
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

  async run (msg) {
    if (!msg.guild.me.permissions.has('MANAGE_ROLES')) return msg.channel.send('The bot requires the Manage_Roles permission for this to work.');

    const toggle = db.get(`servers.${msg.guild.id}.proles.system`) || false;

    if (toggle === true) {
      db.set(`servers.${msg.guild.id}.proles.system`, false);
      return msg.channel.send('The persistent role system for this server has been disabled.');
    }

    db.set(`servers.${msg.guild.id}.proles.system`, true);
    return msg.channel.send('The persistent role system for this server has been enabled.');
  }
}

module.exports = persistentRoles;
