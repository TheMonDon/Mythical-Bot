const Command = require('../../base/Command.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class ToggleAll extends Command {
  constructor(client) {
    super(client, {
      name: 'toggle-all',
      description: 'Toggle all logs',
      usage: 'toggle-all',
      category: 'Logging',
      permLevel: 'Moderator',
      aliases: ['toggleall'],
      guildOnly: true,
    });
  }

  async run(msg) {
    if (!await db.get(`servers.${msg.guild.id}.logs.channel`))
      return msg.channel.send(`The log system is not set up! Use \`${msg.settings.prefix}setlogchannel <channel>\``);

    const all = await db.get(`servers.${msg.guild.id}.logs.logSystem.all`);
    const enable = {
      'bulk-messages-deleted': 'enabled',
      'channel-created': 'enabled',
      'channel-deleted': 'enabled',
      'channel-updated': 'enabled',
      emoji: 'enabled',
      'member-join': 'enabled',
      'member-leave': 'enabled',
      'message-deleted': 'enabled',
      'message-edited': 'enabled',
      'role-created': 'enabled',
      'role-deleted': 'enabled',
      'role-updated': 'enabled',
      'stage-channel-updated': 'enabled',
      'stage-channel-created': 'enabled',
      'stage-channel-deleted': 'enabled',
      'v-channel-created': 'enabled',
      'v-channel-deleted': 'enabled',
      sticker: 'enabled',
      all: 'enabled',
    };
    const disable = {
      'bulk-messages-deleted': 'disabled',
      'channel-created': 'disabled',
      'channel-deleted': 'disabled',
      'channel-updated': 'disabled',
      emoji: 'disabled',
      'member-join': 'disabled',
      'member-leave': 'disabled',
      'message-deleted': 'disabled',
      'message-edited': 'disabled',
      'role-created': 'disabled',
      'role-deleted': 'disabled',
      'role-updated': 'disabled',
      'stage-channel-updated': 'disabled',
      'stage-channel-created': 'disabled',
      'stage-channel-deleted': 'disabled',
      'v-channel-created': 'disabled',
      'v-channel-deleted': 'disabled',
      sticker: 'disabled',
      all: 'disabled',
    };

    if (all === 'enabled') {
      await db.set(`servers.${msg.guild.id}.logs.logSystem`, disable);
      return msg.channel.send('Everything has been disabled.');
    } else if (all === 'disabled') {
      await db.set(`servers.${msg.guild.id}.logs.logSystem`, enable);
      return msg.channel.send('Everything has been enabled.');
    }

    return msg.channel.send(
      'An error occurred, this is probably due to the log system not being setup in this server.',
    );
  }
}

module.exports = ToggleAll;
