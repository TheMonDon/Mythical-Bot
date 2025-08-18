const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class WarnInfo extends Command {
  constructor(client) {
    super(client, {
      name: 'warn-info',
      description: 'View the information of a specific case.',
      usage: 'warn-info <caseID>',
      category: 'Moderator',
      permLevel: 'Moderator',
      aliases: ['case', 'warning', 'caseinfo', 'warninginfo', 'warninfo'],
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const caseID = args.join(' ');
    const connection = await this.client.db.getConnection();

    try {
      await msg.delete();

      const [settingsRows] = await connection.execute(
        /* sql */ `
          SELECT
            warn_log_channel
          FROM
            server_settings
          WHERE
            server_id = ?
        `,
        [msg.guild.id],
      );
      const logChan = settingsRows[0]?.warn_log_channel;

      const [[warn]] = await connection.execute(
        /* sql */ `
          SELECT
            *
          FROM
            warns
          WHERE
            server_id = ?
            AND warn_id = ?
          LIMIT
            1
        `,
        [msg.guild.id, caseID],
      );

      if (!warn) {
        return this.client.util.errorEmbed(msg, 'No warn found with that case ID.');
      }

      let victim = this.client.users.cache.get(warn.user_id);
      if (!victim) {
        victim = await this.client.users.fetch(warn.user_id);
      }

      let moderator = this.client.users.cache.get(warn.mod_id);
      if (!moderator) {
        moderator = await this.client.users.fetch(warn.mod_id);
      }

      const unixTimestamp = Math.floor(Number(warn.timestamp) / 1000);

      const embed = new EmbedBuilder()
        .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
        .setColor(msg.settings.embedColor)
        .addFields([
          { name: 'Case ID', value: warn.warn_id.toString(), inline: true },
          { name: 'User', value: victim.toString(), inline: true },
          { name: 'Points', value: warn.points.toString(), inline: true },
          { name: 'Moderator', value: moderator.toString(), inline: true },
          { name: 'Warned on', value: `<t:${unixTimestamp}:f>`, inline: true },
          { name: 'Message URL', value: warn.message_url, inline: true },
          { name: 'Reason', value: warn.reason, inline: false },
        ]);

      if (msg.channel.id === logChan) {
        return msg.channel.send({ embeds: [embed] });
      } else {
        msg.author.send({ embeds: [embed] }).catch(() => {
          return msg.channel.send(`Please use <#${logChan}> or allow DMs from the bot to view warn information.`);
        });
      }
    } catch (error) {
      console.error('Warn-Info Error:', error);
    } finally {
      connection.release();
    }
  }
}

module.exports = WarnInfo;
