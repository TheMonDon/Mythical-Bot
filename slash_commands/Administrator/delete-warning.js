const { EmbedBuilder, SlashCommandBuilder, MessageFlags, InteractionContextType } = require('discord.js');

exports.conf = {
  permLevel: 'Administrator',
};

exports.commandData = new SlashCommandBuilder()
  .setName('delete-warning')
  .setDescription('Delete a specific warnings case.')
  .addStringOption((option) => option.setName('case_id').setDescription(' The Case ID To delete').setRequired(true))
  .setContexts(InteractionContextType.Guild);

exports.run = async (interaction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const connection = await interaction.client.db.getConnection();

  let title = 'Case Cleared';
  let color = interaction.settings.embedColor;

  try {
    const caseID = interaction.options.getString('case_id');
    const [[warning]] = await connection.execute(
      /* sql */ `
        SELECT
          *
        FROM
          warns
        WHERE
          server_id = ?
          AND warn_id = ?
      `,
      [interaction.guild.id, caseID],
    );

    if (!warning) {
      return interaction.client.util.errorEmbed(interaction, 'Warning case not found', 'Invalid Case ID');
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
      [interaction.guild.id],
    );
    const logChan = settingsRows[0]?.warn_log_channel;
    const warnReason = warning.reason || 'No reason specified';

    // Get total points before
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
      [interaction.guild.id, warning.user_id],
    );
    const previousPoints = Number(beforeRow.totalPoints);

    // Get the points of the warn being deleted
    const [[warnRow]] = await connection.execute(
      /* sql */ `
        SELECT
          points
        FROM
          warns
        WHERE
          server_id = ?
          AND warn_id = ?
      `,
      [interaction.guild.id, caseID],
    );
    const deletedPoints = warnRow ? Number(warnRow.points) : 0;

    // Delete the warn
    await connection.execute(
      /* sql */ `
        DELETE FROM warns
        WHERE
          server_id = ?
          AND warn_id = ?
      `,
      [interaction.guild.id, caseID],
    );

    // Calculate new total
    const newerPoints = previousPoints - deletedPoints;

    if (previousPoints >= 10 && newerPoints < 10) {
      if (!interaction.guild.members.me.permissions.has('BanMembers')) {
        interaction.client.util.errorEmbed(
          interaction,
          'Please unban the user manually, the bot does not have Ban Members permission.',
          'Missing Permission',
        );
      } else {
        await interaction.guild.members.unban(warning.user_id).catch(() => null);
        title += ' & User Unbanned';
        color = interaction.settings.embedSuccessColor;
      }
    } else {
      color = interaction.settings.embedSuccessColor;
    }

    // Get the user from cache, if they don't exist then force fetch them
    let user = interaction.client.users.cache.get(warning.user_id);
    if (!user) {
      user = await interaction.client.users.fetch(warning.user_id);
    }

    const userEmbed = new EmbedBuilder()
      .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
      .setTitle(title)
      .setColor(color)
      .addFields([
        { name: 'Moderator', value: `${interaction.user} (${interaction.user.id})`, inline: true },
        { name: 'Deleted Case', value: `\`${caseID}\``, inline: true },
        { name: 'Case Reason', value: warnReason, inline: true },
        { name: 'Issued In', value: interaction.guild.name, inline: true },
      ]);
    let userMessage;
    if (user) {
      userMessage = await user.send({ embeds: [userEmbed] }).catch(() => null);
    }

    let userString;
    if (user) {
      userString = `${user} (${user.id})`;
    } else {
      userString = 'Unknown User';
    }

    const logEmbed = new EmbedBuilder()
      .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
      .setTitle(title)
      .setColor(color)
      .addFields([
        { name: 'Moderator', value: `${interaction.user} (${interaction.user.id})`, inline: true },
        { name: 'User', value: userString, inline: true },
        { name: 'Deleted Case', value: `\`${caseID}\``, inline: true },
        { name: 'Case Reason', value: warnReason, inline: true },
      ]);
    if (!userMessage) logEmbed.setFooter({ text: 'Failed to send a DM to the user. (User has DMs disabled)' });

    if (logChan) {
      await interaction.editReply({ embeds: [logEmbed] });

      return interaction.guild.channels.cache.get(logChan).send({ embeds: [logEmbed] });
    } else {
      return interaction.editReply({ embeds: [logEmbed] });
    }
  } catch (error) {
    console.error('Delete-Warnings Error:', error);
    return interaction.editReply(`An error occurred: ${error.message}`);
  } finally {
    connection.release();
  }
};
