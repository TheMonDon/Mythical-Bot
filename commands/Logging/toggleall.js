const Command = require('../../base/Command.js');
const db = require('quick.db');

class toggleall extends Command {
  constructor(client) {
    super(client, {
      name: 'toggleall',
      description: 'Toggle all logs',
      usage: 'toggleall',
      category: 'Logging',
      permLevel: 'Moderator',
      aliases: ['ta', 'toggle-all']
    });
  }

  async run(msg) {
    if (!db.get(`servers.${msg.guild.id}.logs.channel`)) return msg.channel.send(`The log system is not set up! Use \`${msg.settings.prefix}setlogchannel <channel>\``);

    const all = db.get(`servers.${msg.guild.id}.logs.log_system.all`);
    const enable = {
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
      'bulk-messages-deleted': 'enabled',
      'all': 'enabled'
    };
    const disable = {
      'channel-created': 'disabled',
      'channel-deleted': 'disabled',
      'channel-updated': 'disabled',
      'member-join': 'disabled',
      'member-leave': 'disabled',
      'message-deleted': 'disabled',
      'message-edited': 'disabled',
      'role-created': 'disabled',
      'role-deleted': 'disabled',
      'role-updated': 'disabled',
      'v-channel-created': 'disabled',
      'v-channel-deleted': 'disabled',
      'emoji-created': 'disabled',
      'emoji-deleted': 'disabled',
      'bulk-messages-deleted': 'disabled',
      'all': 'disabled'
    };

    if (all === 'enabled') {
      db.set(`servers.${msg.guild.id}.logs.log_system`, disable);
      return msg.channel.send('Everything has been disabled.');
    } else if (all === 'disabled') {
      db.set(`servers.${msg.guild.id}.logs.log_system`, enable);
      return msg.channel.send('Everything has been enabled.');
    }

    return msg.channel.send('An error occured, this is probably due to the log system not beign setup in this server.');
  }
}

module.exports = toggleall;