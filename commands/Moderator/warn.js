const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const { EmbedBuilder } = require('discord.js');

class Warn extends Command {
  constructor(client) {
    super(client, {
      name: 'warn',
      description: 'Warns a member',
      longDescription: stripIndents`
        Warn system that will kick or ban a user depending on the points they have.
        Users are kicked when they reach 8 points, or banned when they reach 10. (Change with \`setup\` command)`,
      usage: 'warn <User> [0-1000 Points] <Reason>',
      category: 'Moderator',
      permLevel: 'Moderator',
      requiredArgs: 2,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    let mem;
    let member = true;
    let logMessage;

    const connection = await this.client.db.getConnection();

    try {
      await msg.delete();
      mem = await this.client.util.getMember(msg, args[0]);

      // Find the user by user ID
      if (!mem) {
        const ID = args[0].replace(/<@|>/g, '');
        try {
          mem = await this.client.users.fetch(ID);
          member = false;
        } catch (err) {
          return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Member');
        }
      }

      if (member) {
        const owner = await msg.guild.fetchOwner();
        if (mem.roles.highest.position > msg.member.roles.highest.position - 1 && msg.author.id !== owner.user.id) {
          return this.client.util.errorEmbed(msg, "You can't warn someone with an equal or higher role than you.");
        }
      }

      // Check if points were provided
      let points = 0; // Default to 0
      let reasonStartIndex = 1; // By default, the reason starts after the user mention

      if (args[1] && !isNaN(parseInt(args[1], 10))) {
        points = parseInt(args[1], 10);
        if (points < 0 || points > 1000) {
          return this.client.util.errorEmbed(
            msg,
            msg.settings.prefix + this.help.usage,
            'Points must be between 0 and 1000',
          );
        }
        reasonStartIndex = 2; // If points are provided, the reason starts after the second argument
      }

      // Extract reason
      const reason = args.slice(reasonStartIndex).join(' ');
      if (!reason) {
        return this.client.util.errorEmbed(msg, 'Please provide a valid reason', 'Invalid Argument');
      }

      // Grab the settings for the server
      const [settingsRows] = await connection.execute(
        /* sql */ `
          SELECT
            warn_kick_threshold,
            warn_ban_threshold,
            warn_log_channel
          FROM
            server_settings
          WHERE
            server_id = ?
        `,
        [msg.guild.id],
      );
      const kickAmount = settingsRows[0]?.warn_kick_threshold || 8;
      const banAmount = settingsRows[0]?.warn_ban_threshold || 10;
      const logChan = settingsRows[0]?.warn_log_channel;

      // Make sure that the ID doesn't exist on that server
      let warnID = this.client.util.randomString(5);

      let [rows] = await connection.execute(
        /* sql */ `
          SELECT
            1
          FROM
            warns
          WHERE
            warn_id = ?
          LIMIT
            1
        `,
        [warnID],
      );

      while (rows.length > 0) {
        warnID = this.client.util.randomString(5);
        [rows] = await connection.execute(
          /* sql */ `
            SELECT
              1
            FROM
              warns
            WHERE
              warn_id = ?
            LIMIT
              1
          `,
          [warnID],
        );
      }

      // Get the users current warns and total points
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
        [msg.guild.id, mem.id],
      );

      const warnAmount = Number(pointsRow.totalPoints) + points;

      // Set the status and color of the embed
      let status = 'warned';
      let color = '#FFA500';
      if (warnAmount === kickAmount) {
        status = 'kicked';
        color = '#FFD700';
      } else if (warnAmount >= banAmount) {
        status = 'banned';
        color = '#FF0000';
      }

      // Check if they have other cases
      let otherCases = otherWarns.length > 0 ? otherWarns.map((w) => `\`${w.warn_id}\``).join(', ') : 'No other cases.';
      if (!otherCases) otherCases = 'No other cases';

      // Send the embed to the users DMS
      const userEmbed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
        .setTitle(`You have been ${status}`)
        .addFields([
          { name: 'Case ID', value: `\`${warnID}\`` },
          { name: 'Points', value: `${points} points (Total: ${warnAmount} points)` },
          { name: 'Other Cases', value: otherCases },
          { name: 'Reason', value: reason, inline: false },
        ])
        .setFooter({ text: `Issued in: ${msg.guild.name}` });
      const userMessage = await mem.send({ embeds: [userEmbed] }).catch(() => null);

      // Create the embed for the logs channel
      const logEmbed = new EmbedBuilder()
        .setColor(color)
        .setFooter({ text: `${msg.author.tag} • User ID: ${mem.id}` })
        .setTitle(`User has been ${status}`)
        .addFields([
          { name: 'User', value: `${mem} (${mem.id})`, inline: true },
          { name: 'Moderator', value: `${msg.author.tag} (${msg.author.id})`, inline: true },
          { name: 'Case ID', value: `\`${warnID}\``, inline: true },
          { name: 'Points', value: `${points} points (Total: ${warnAmount} points)`, inline: true },
          { name: 'Other Cases', value: otherCases, inline: true },
          { name: 'Reason', value: reason, inline: false },
        ]);
      if (!userMessage) logEmbed.setFooter({ text: 'Failed to send a DM to the user. (User has DMs disabled)' });

      // Check if the logs channel exists and send the message
      if (logChan) {
        logMessage = await msg.guild.channels.cache
          .get(logChan)
          .send({ embeds: [logEmbed] })
          .catch(() => {});

        const channelEmbed = new EmbedBuilder()
          .setColor(color)
          .setFooter({ text: `${msg.author.tag} • User ID: ${mem.id}` })
          .setTitle(`User has been ${status}`)
          .addFields([{ name: 'User', value: `${mem} (${mem.id})` }])
          .setURL(logMessage.url)
          .setDescription('Full info posted inside the log channel.');

        await msg.channel.send({ embeds: [channelEmbed] }).then((embed) => {
          setTimeout(() => embed.delete(), 30000);
        });
      } else {
        logMessage = await msg.channel.send({ embeds: [logEmbed] });
      }

      // Add the warn to the database
      await connection.execute(
        /* sql */
        `
          INSERT INTO
            warns (
              warn_id,
              server_id,
              user_id,
              mod_id,
              points,
              reason,
              message_url,
              timestamp
            )
          VALUES
            (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [warnID, msg.guild.id, mem.id, msg.author.id, points, reason, logMessage.url, Date.now()],
      );

      // Check if they should be banned or kicked
      if (warnAmount >= banAmount) {
        if (!msg.guild.members.me.permissions.has('BanMembers')) {
          return msg.channel.send('The bot does not have permission to ban members.');
        }

        await msg.guild.members.ban(mem.id, { reason }).catch(() => null); // Ban wether they are in the guild or not.
      } else if (warnAmount >= kickAmount) {
        if (!msg.guild.members.me.permissions.has('KickMembers')) {
          return msg.channel.send('The bot does not have permission to kick members.');
        }

        const member = msg.guild.members.cache.get(mem.id);
        if (member) await member.kick(reason).catch(() => null); // Kick them if they are in the guild
      }
    } catch (error) {
      console.error('Warn user error:', error);
      return msg.channel.send(`An error occurred: ${error.message}`);
    } finally {
      connection.release();
    }
  }
}

module.exports = Warn;
