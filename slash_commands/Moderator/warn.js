const { EmbedBuilder, SlashCommandBuilder, InteractionContextType, MessageFlags } = require('discord.js');

exports.conf = {
  permLevel: 'Moderator',
};

exports.commandData = new SlashCommandBuilder()
  .setName('warn')
  .setContexts(InteractionContextType.Guild)
  .setDescription('Warn a user')
  .addUserOption((option) => option.setName('user').setDescription('The user you want to warn').setRequired(true))
  .addStringOption((option) =>
    option.setName('reason').setDescription('Why are you warning the user?').setRequired(true),
  )
  .addIntegerOption((option) =>
    option
      .setName('amount')
      .setDescription('The amount of points to warn the user for')
      .setMinValue(0)
      .setMaxValue(1000)
      .setRequired(false),
  );

exports.run = async (interaction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const user = interaction.options.getUser('user');

  let member = true;
  let logMessage;
  let mem;

  const connection = await interaction.client.db.getConnection();

  try {
    mem = await interaction.client.util.getMember(interaction, user.id);
    if (!mem) {
      mem = user;
      member = false;
    }

    if (member) {
      const owner = await interaction.guild.fetchOwner();
      if (
        mem.roles.highest.position > interaction.member.roles.highest.position - 1 &&
        interaction.user.id !== owner.user.id
      )
        return interaction.client.util.errorEmbed(
          interaction,
          "You can't warn someone with an equal or higher role than you.",
        );
    }

    const points = interaction.options.getInteger('amount') || 0;
    const reason = interaction.options.getString('reason');

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
      [interaction.guild.id],
    );
    const kickAmount = settingsRows[0]?.warn_kick_threshold || 8;
    const banAmount = settingsRows[0]?.warn_ban_threshold || 10;
    const logChan = settingsRows[0]?.warn_log_channel;

    // Make sure that the ID doesn't exist on that server
    let warnID = interaction.client.util.randomString(5);

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
      warnID = interaction.client.util.randomString(5);
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
      [interaction.guild.id, mem.id],
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
      [interaction.guild.id, mem.id],
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
    let otherCases = otherWarns.length > 0 ? otherWarns.map((w) => `\`${w.warnID}\``).join(', ') : 'No other cases.';
    if (!otherCases) otherCases = 'No other cases';

    // Send the embed to the users DMS
    const userEmbed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
      .setTitle(`You have been ${status}`)
      .addFields([
        { name: 'Case ID', value: `\`${warnID}\`` },
        { name: 'Points', value: `${points} points (Total: ${warnAmount} points)` },
        { name: 'Other Cases', value: otherCases },
        { name: 'Reason', value: reason, inline: false },
      ])
      .setFooter({ text: `Issued in: ${interaction.guild.name}` });
    const userMessage = await mem.send({ embeds: [userEmbed] }).catch(() => null);

    // Create the embed for the logs channel
    const logEmbed = new EmbedBuilder()
      .setColor(color)
      .setFooter({ text: `${interaction.user.tag} • User ID: ${mem.id}` })
      .setTitle(`User has been ${status}`)
      .addFields([
        { name: 'User', value: `${mem} (${mem.id})`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
        { name: 'Case ID', value: `\`${warnID}\``, inline: true },
        { name: 'Points', value: `${points} points (Total: ${warnAmount} points)`, inline: true },
        { name: 'Other Cases', value: otherCases, inline: true },
        { name: 'Reason', value: reason, inline: false },
      ]);
    if (!userMessage) logEmbed.setFooter({ text: 'Failed to send a DM to the user. (User has DMs disabled)' });

    // Check if the logs channel exists and send the message
    if (logChan) {
      logMessage = await interaction.guild.channels.cache
        .get(logChan)
        .send({ embeds: [logEmbed] })
        .catch(() => {});

      await interaction.editReply({ embeds: [logEmbed] });
    } else {
      logMessage = await interaction.editReply({ embeds: [logEmbed] });
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
      [warnID, interaction.guild.id, mem.id, interaction.user.id, points, reason, logMessage.url, Date.now()],
    );

    // Check if they should be banned or kicked
    if (warnAmount >= banAmount) {
      if (!interaction.guild.members.me.permissions.has('BanMembers')) {
        return interaction.editReply('The bot does not have permission to ban members.');
      }

      await interaction.guild.members.ban(mem.id, { reason }).catch(() => null); // Ban wether they are in the guild or not.
    } else if (warnAmount >= kickAmount) {
      if (!interaction.guild.members.me.permissions.has('KickMembers')) {
        return interaction.editReply('The bot does not have permission to kick members.');
      }

      const member = interaction.guild.members.cache.get(mem.id);
      if (member) await member.kick(reason).catch(() => null); // Kick them if they are in the guild
    }
  } catch (error) {
    console.error('Warn user error:', error);
    interaction.editReply(`An error occurred: ${error.message}`);
  } finally {
    connection.release();
  }
};
