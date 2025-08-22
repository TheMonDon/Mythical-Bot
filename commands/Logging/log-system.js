const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class logSystem extends Command {
  constructor(client) {
    super(client, {
      name: 'log-system',
      description: 'See information about the log system',
      usage: 'Log-System',
      category: 'Logging',
      permLevel: 'Moderator',
      aliases: ['logsystem'],
      guildOnly: true,
    });
  }

  async run(msg) {
    const connection = await this.client.db.getConnection();

    try {
      // Check if log system is set up
      const [rows] = await connection.execute(`SELECT * FROM log_settings WHERE server_id = ?`, [msg.guild.id]);

      if (rows.length === 0 || !rows[0].channel_id) {
        return msg.channel.send(`The log system is not set up! Use \`${msg.settings.prefix}Setup Logging <Channel>\``);
      }

      const settings = rows[0];

      function formatLogType(logType, value) {
        const formatted = logType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

        return `**${formatted}:** ${value ? '✅' : '❌'}`;
      }

      const logTypes = [
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
        'message_updated',
        'message_deleted',
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

      const logInfo = logTypes.map((type) => formatLogType(type, settings[type]));

      const embed = new EmbedBuilder().setColor(msg.settings.embedColor).addFields([
        { name: 'Toggle Status', value: logInfo.join('\n'), inline: true },
        { name: 'Log Channel', value: `<#${settings.channel_id}>` },
      ]);

      return msg.channel.send({ embeds: [embed] });
    } catch (error) {
      this.client.logger.error(error);
      return msg.channel.send(`An error occurred: ${error.message}`);
    } finally {
      connection.release();
    }
  }
}

module.exports = logSystem;
