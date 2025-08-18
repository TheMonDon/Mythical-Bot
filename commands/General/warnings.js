const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class Warnings extends Command {
  constructor(client) {
    super(client, {
      name: 'warnings',
      description: 'View all your warnings. Moderators can view others warnings',
      usage: 'warnings [user]',
      category: 'General',
      aliases: ['warns'],
      guildOnly: true,
    });
  }

  async run(msg, args, level) {
    const connection = await this.client.db.getConnection();

    const warns = [];
    let mem;

    try {
      if (args?.length < 1) {
        mem = msg.author;
      } else {
        mem = await this.client.util.getMember(msg, args.join(' '));

        // Find the user by user ID
        if (!mem) {
          const ID = args[0].replace(/<@|>/g, '');
          try {
            mem = await this.client.users.fetch(ID);
          } catch (err) {
            mem = msg.author;
          }
        }

        mem = level > 1 ? mem : msg.author;
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

      const [[pointsRow]] = await connection.execute(
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
        [msg.author.id, mem.id],
      );

      const totalPoints = Number(pointsRow.totalPoints);

      if (otherWarns) {
        let otherCases =
          otherWarns.length > 0 ? otherWarns.map((w) => `\`${w.warn_id}\``).join(', ') : 'No other cases.';
        if (!otherCases) otherCases = 'No other Cases';

        for (const data of otherWarns) {
          const unixTimestamp = Math.floor(Number(data.timestamp) / 1000);

          warns.push(
            `\`${data.warn_id}\` - ${data.points} pts - ${this.client.util.limitStringLength(data.reason, 0, 24)} - ` +
              `<t:${unixTimestamp}:f>`,
          );
        }
      }

      mem = mem.user ? mem.user : mem;
      const maxWarnings = 60;
      const cappedWarns = warns.slice(0, maxWarnings).join('\n');
      const overflowMessage = warns.length > maxWarnings ? `\n...and ${warns.length - maxWarnings} more warnings.` : '';
      const embedContent = cappedWarns + overflowMessage;

      const embed = new EmbedBuilder()
        .setAuthor({ name: mem.username, iconURL: mem.displayAvatarURL() })
        .setColor('#FFA500')
        .setTitle(`Total Warning Points: ${totalPoints}`)
        .setDescription(warns.length ? embedContent : 'This user is squeaky clean.');

      if (msg.channel.id === logChan) {
        return msg.channel.send({ embeds: [embed] });
      } else {
        msg.author.send({ embeds: [embed] }).catch(() => {
          return msg.channel.send(`Please use <#${logChan}> or allow DMs from the bot to view warnings.`);
        });
      }
    } catch (error) {
      console.error('Warnings Error:', error);
    } finally {
      connection.release();
    }
  }
}

module.exports = Warnings;
