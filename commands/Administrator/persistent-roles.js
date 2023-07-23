const Command = require('../../base/Command.js');
const db = require('quick.db');

class persistentRoles extends Command {
  constructor(client) {
    super(client, {
      name: 'persistent-roles',
      description: 'Enable/Disable the persistent roles system for your guild.',
      longDescription:
        'When persistent roles is enabled users who leave the guild will have their roles automatically returned when they come back.',
      category: 'Administrator',
      permLevel: 'Administrator',
      usage: 'persistent-roles',
      aliases: ['pr', 'proles'],
      guildOnly: true,
    });
  }

  async run(msg) {
    if (!msg.guild.members.me.permissions.has('ManageRoles'))
      return this.client.util.errorEmbed(
        msg,
        'Manage Roles permission is required on the bot to use this.',
        'Missing Permission',
      );

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
