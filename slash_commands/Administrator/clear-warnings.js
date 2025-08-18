const { EmbedBuilder, SlashCommandBuilder, MessageFlags, InteractionContextType } = require('discord.js');

exports.conf = {
  permLevel: 'Administrator',
};

exports.commandData = new SlashCommandBuilder()
  .setName('clear-warnings')
  .setDescription('Clear all the warnings from a specific user.')
  .addUserOption((option) => option.setName('user').setDescription('The user to clear warnings from').setRequired(true))
  .setContexts(InteractionContextType.Guild);

exports.run = async (interaction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const connection = await this.client.db.getConnection();

  try {
    const mem = interaction.options.getUser('user');
    let color = interaction.settings.embedColor;

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
      [interaction.guild.id, mem.id],
    );
    const previousPoints = Number(beforeRow.totalPoints);

    if (!otherWarns || otherWarns.length < 1) {
      return interaction.client.util.errorEmbed(interaction, 'That user has no warnings.');
    }

    await connection.execute(
      /* sql */ `
        DELETE FROM warns
        WHERE
          server_id = ?
          AND user_id = ?
      `,
      [interaction.guild.id, mem.id],
    );

    if (previousPoints >= 10) {
      if (!interaction.guild.members.me.permissions.has('BanMembers')) {
        interaction.client.util.errorEmbed(
          interaction,
          'Please unban the user manually, the bot does not have Ban Members permission.',
          'Missing Permission',
        );
      } else {
        await interaction.guild.members.unban(mem.id).catch(() => null);
        color = interaction.settings.embedSuccessColor;
      }
    } else {
      color = interaction.settings.embedSuccessColor;
    }

    const otherCases = otherWarns.map((w) => `\`${w.warnID}\``).join(', ');

    const userEmbed = new EmbedBuilder()
      .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
      .setDescription('Warnings Cleared')
      .setColor(color)
      .addFields([
        { name: 'Moderator', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
        { name: 'Cleared Cases', value: otherCases, inline: true },
        { name: 'Issued In', value: interaction.guild.name, inline: true },
      ]);
    const userMessage = await mem.send({ embeds: [userEmbed] }).catch(() => null);

    const logEmbed = new EmbedBuilder()
      .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
      .setTitle('Warnings Cleared')
      .setColor(color)
      .addFields([
        { name: 'Moderator', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
        { name: 'User', value: `${mem} (${mem.id})`, inline: true },
        { name: 'Cleared Cases', value: otherCases, inline: true },
      ]);
    if (!userMessage) logEmbed.setFooter({ text: 'Failed to send a DM to the user. (User has DMs disabled)' });

    if (logChan) {
      await interaction.editReply({ embeds: [logEmbed] });

      return interaction.guild.channels.cache.get(logChan).send({ embeds: [logEmbed] });
    } else {
      return interaction.editReply({ embeds: [logEmbed] });
    }
  } catch (error) {
    console.error('Clear-Warning Error:', error);
    return interaction.editReply(`An error occurred: ${error.message}`);
  } finally {
    connection.release();
  }
};
