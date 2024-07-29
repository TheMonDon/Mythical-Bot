const Command = require('../../base/Command.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class persistentRoles extends Command {
  constructor(client) {
    super(client, {
      name: 'persistent-roles',
      description: 'Enable/Disable the persistent roles system for your guild',
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

    const toggle = (await db.get(`servers.${msg.guild.id}.proles.system`)) || false;

    await db.set(`servers.${msg.guild.id}.proles.system`, toggle !== true);
    return msg.channel.send(
      `The persistent role system for this server has been ${toggle !== true ? 'disabled' : 'enabled'}.`,
    );
  }
}

module.exports = persistentRoles;
