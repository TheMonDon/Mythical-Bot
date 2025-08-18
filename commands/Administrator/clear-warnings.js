const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class ClearWarnings extends Command {
  constructor(client) {
    super(client, {
      name: 'clear-warnings',
      description: 'Clear all the warnings of the specific user',
      usage: 'clear-warnings <User>',
      category: 'Administrator',
      permLevel: 'Administrator',
      aliases: ['clearwarns', 'clearwarnings', 'cwarns'],
      guildOnly: true,
      requiredArgs: 1,
    });
  }

  async run(msg, args) {
    const connection = await this.client.db.getConnection();

    let color = msg.settings.embedColor;

    try {
      await msg.delete();

      let mem = await this.client.util.getMember(msg, args.join(' '));

      if (!mem) {
        const ID = args[0].replace(/<@|>/g, '');
        try {
          mem = await this.client.users.fetch(ID);
        } catch (err) {
          return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Member');
        }
      }
 
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

      const [otherWarns] = await connection.execute(
        /* sql */
        `
          SELECT
            *
          FROM
            warns
          WHERE
            server_id = ?
            AND user_id = ?
          ORDER BY
            timestamp ASC
        `,
        [msg.guild.id, mem.id],
      );

      const [[beforeRow]] = await connection.execute(
        /* sql */
        `
          SELECT
            COALESCE(SUM(points), 0) AS totalPoints
          FROM
            warns
          WHERE
            server_id = ?
            AND user_id = ?
        `,
        [msg.guild.id, mem.id],
      );
      const previousPoints = Number(beforeRow.totalPoints);

      if (!otherWarns || otherWarns.length < 1) {
        return this.client.util.errorEmbed(msg, 'That user has no warnings.');
      }

      await connection.execute(
        /* sql */ `
          DELETE FROM warns
          WHERE
            server_id = ?
            AND user_id = ?
        `,
        [msg.guild.id, mem.id],
      );

      if (previousPoints >= 10) {
        if (!msg.guild.members.me.permissions.has('BanMembers')) {
          this.client.util.errorEmbed(
            msg,
            'Please unban the user manually, the bot does not have Ban Members permission.',
            'Missing Permission',
          );
        } else {
          await msg.guild.members.unban(mem.id).catch(() => null);
          color = msg.settings.embedSuccessColor;
        }
      } else {
        color = msg.settings.embedSuccessColor;
      }

      const otherCases = otherWarns.map((w) => `\`${w.warn_id}\``).join(', ');

      const userEmbed = new EmbedBuilder()
        .setDescription('Warnings Cleared')
        .setColor(color)
        .addFields([
          { name: 'Moderator', value: `${msg.author.tag} (${msg.author.id})`, inline: true },
          { name: 'Cleared Cases', value: otherCases, inline: true },
          { name: 'Issued In', value: msg.guild.name, inline: true },
        ]);
      const userMessage = await mem.send({ embeds: [userEmbed] }).catch(() => null);

      const logEmbed = new EmbedBuilder()
        .setTitle('Warnings Cleared')
        .setColor(color)
        .addFields([
          { name: 'Moderator', value: `${msg.author.tag} (${msg.author.id})`, inline: true },
          { name: 'User', value: `${mem} (${mem.id})`, inline: true },
          { name: 'Cleared Cases', value: otherCases, inline: true },
        ]);
      if (!userMessage) logEmbed.setFooter({ text: 'Failed to send a DM to the user. (User has DMs disabled)' });

      if (logChan) {
        const channelEmbed = new EmbedBuilder()
          .setTitle('Warnings Cleared')
          .setColor(color)
          .addFields([
            { name: 'User', value: `${mem} (${mem.id})` },
            { name: 'Cleared Cases', value: otherCases },
          ]);

        await msg.channel.send({ embeds: [channelEmbed] }).then((embed) => {
          setTimeout(() => embed.delete(), 30000);
        });

        return msg.guild.channels.cache.get(logChan).send({ embeds: [logEmbed] });
      } else {
        return msg.channel.send({ embeds: [logEmbed] });
      }
    } catch (error) {
      console.error('Clear-Warnings Error:', error);
    } finally {
      connection.release();
    }
  }
}

module.exports = ClearWarnings;
