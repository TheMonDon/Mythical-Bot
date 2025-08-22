const Command = require('../../base/Command.js');

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
    const connection = await this.client.db.getConnection();

    try {
      // Check if log system is set up
      const [rows] = await connection.execute('SELECT * FROM log_settings WHERE server_id = ?', [msg.guild.id]);

      if (rows.length === 0 || !rows[0].channel_id) {
        return msg.channel.send(`The log system is not set up! Use \`${msg.settings.prefix}Setup Logging <Channel>\``);
      }

      const allEnabled = rows[0].all_enabled === 1;

      // List of log columns we want to toggle
      const logColumns = [
        'all_enabled',
        'bulk_messages_deleted',
        'channel_created',
        'channel_deleted',
        'channel_updated',
        'emoji_created',
        'emoji_deleted',
        'emoji_updated',
        'member_join',
        'member_leave',
        'member_timeout',
        'message_deleted',
        'message_updated',
        'role_created',
        'role_deleted',
        'role_updated',
        'sticker_created',
        'sticker_deleted',
        'sticker_updated',
        'thread_created',
        'thread_deleted',
        'thread_updated',
        'voice_channel_created',
        'voice_channel_deleted',
      ];

      // Build SQL update for all log columns + all_enabled
      const fields = [...logColumns, 'all_enabled'].map((col) => `${col} = ?`).join(', ');

      const newValue = !allEnabled;
      const params = Array(logColumns.length + 1).fill(newValue); // fill all with newValue
      params.push(msg.guild.id);

      await connection.execute(`UPDATE log_settings SET ${fields} WHERE server_id = ?`, params);

      return msg.channel.send(allEnabled ? 'Everything has been disabled.' : 'Everything has been enabled.');
    } catch (error) {
      this.client.logger.error(error);
      return msg.channel.send(`An error occurred: ${error.message}`);
    } finally {
      connection.release();
    }
  }
}

module.exports = ToggleAll;
