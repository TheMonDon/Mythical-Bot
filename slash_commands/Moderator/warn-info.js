const { EmbedBuilder, SlashCommandBuilder, InteractionContextType, MessageFlags } = require('discord.js');

exports.conf = {
  permLevel: 'Moderator',
};

exports.commandData = new SlashCommandBuilder()
  .setName('warn-info')
  .setContexts(InteractionContextType.Guild)
  .setDescription('View the information of a specific case.')
  .addStringOption((option) =>
    option.setName('case_id').setDescription('The specific warning to get information on').setRequired(true),
  );

exports.run = async (interaction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const connection = await interaction.client.db.getConnection();

  try {
    const caseID = interaction.options.getString('case_id');
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
      [interaction.guild.id, caseID],
    );

    if (!warn) return interaction.editReply("I couldn't find any case with that ID.");

    let victim = interaction.client.users.cache.get(warn.user_id);
    if (!victim) {
      victim = await interaction.client.users.fetch(warn.user_id);
    }

    let moderator = interaction.client.users.cache.get(warn.mod_id);
    if (!moderator) {
      moderator = await interaction.client.users.fetch(warn.mod_id);
    }

    const unixTimestamp = Math.floor(Number(warn.timestamp) / 1000);

    const embed = new EmbedBuilder()
      .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
      .setColor(interaction.settings.embedColor)
      .addFields([
        { name: 'Case ID', value: warn.warn_id.toString(), inline: true },
        { name: 'User', value: victim.toString(), inline: true },
        { name: 'Points', value: warn.points.toString(), inline: true },
        { name: 'Moderator', value: moderator.toString(), inline: true },
        { name: 'Warned on', value: `<t:${unixTimestamp}:f>`, inline: true },
        { name: 'Message URL', value: warn.message_url, inline: true },
        { name: 'Reason', value: warn.reason, inline: false },
      ]);

    return interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Warn-Info Error:', error);
    return interaction.editReply(`An error occurred: ${error.message}`);
  } finally {
    connection.release();
  }
};
