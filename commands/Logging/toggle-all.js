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
    if (!(await db.get(`servers.${msg.guild.id}.logs.channel`)))
      return msg.channel.send(`The log system is not set up! Use \`${msg.settings.prefix}setup logging <channel>\``);

    const all = await db.get(`servers.${msg.guild.id}.logs.logSystem.all`);
    const logSystem = {
      'bulk-messages-deleted': 'enabled',
      'channel-created': 'enabled',
      'channel-deleted': 'enabled',
      'channel-updated': 'enabled',
      emoji: 'enabled',
      'member-join': 'enabled',
      'member-leave': 'enabled',
      'member-timeout': 'enabled',
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

    if (all === 'enabled') {
      Object.keys(logSystem).forEach((key) => {
        logSystem[key] = 'disabled';
      });

      await db.set(`servers.${msg.guild.id}.logs.logSystem`, logSystem);
      return msg.channel.send('Everything has been disabled.');
    } else if (all === 'disabled') {
      await db.set(`servers.${msg.guild.id}.logs.logSystem`, logSystem);
      return msg.channel.send('Everything has been enabled.');
    }

    return msg.channel.send(
      'An error occurred, this is probably due to the log system not being setup in this server.',
    );
  }
}

module.exports = ToggleAll;
