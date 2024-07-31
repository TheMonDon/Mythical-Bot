const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

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
    if (!(await db.get(`servers.${msg.guild.id}.logs.channel`)))
      return msg.channel.send(`The log system is not set up! Use \`${msg.settings.prefix}Setup Logging <Channel>\``);

    async function getLogInfo(guildId, logType) {
      const logValue = await db.get(`servers.${guildId}.logs.logSystem.${logType}`);
      return logValue === 'enabled' ? 'Enabled' : ':x:';
    }

    async function getAllLogInfo(msg) {
      const logTypes = [
        'bulk-messages-deleted',
        'channel-created',
        'channel-deleted',
        'channel-updated',
        'emoji',
        'member-join',
        'member-leave',
        'member-timeout',
        'message-edited',
        'message-deleted',
        'thread-created',
        'thread-deleted',
        'v-channel-created',
        'v-channel-deleted',
        'role-created',
        'role-deleted',
        'role-updated',
        'sticker',
      ];

      const logInfo = [];
      for (const logType of logTypes) {
        const logValue = await getLogInfo(msg.guild.id, logType);
        const formattedLogType = logType.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        const correctedLogType = formattedLogType
          .replace('V', 'Voice')
          .replace('Emoji', 'Emojis')
          .replace('Sticker', 'Stickers');
        logInfo.push(`**${correctedLogType}:** ${logValue}`);
      }

      return logInfo.join('\n');
    }

    const logOutput = await getAllLogInfo(msg);

    const embed = new EmbedBuilder().setColor(msg.settings.embedColor).addFields([
      {
        name: 'Toggle Status',
        value: logOutput,
        inline: true,
      },
      { name: 'Log Channel', value: `<#${await db.get(`servers.${msg.guild.id}.logs.channel`)}>` },
    ]);

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = logSystem;
