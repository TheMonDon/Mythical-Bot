const { EmbedBuilder, SlashCommandBuilder, InteractionContextType, MessageFlags } = require('discord.js');

exports.conf = {
  permLevel: 'Moderator',
};

exports.commandData = new SlashCommandBuilder()
  .setName('unban')
  .setContexts(InteractionContextType.Guild)
  .setDescription('Unban a user from the server')
  .addStringOption((option) =>
    option.setName('user_id').setDescription('The User ID of the person to unban').setRequired(true),
  )
  .addStringOption((option) => option.setName('reason').setDescription('The reason to unban the user'));

exports.run = async (interaction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  if (!interaction.guild.members.me.permissions.has('BanMembers')) {
    return interaction.editReply('The bot is missing Ban Members permission.');
  }

  // Regex to check if the input for userID is a number
  const regex = /\d+/g;
  const userID = interaction.options.getString('user_id');
  const reason = interaction.options.getString('reason');
  const successColor = interaction.settings.embedSuccessColor;

  if (!userID.matches(regex)) return interaction.editReply(`Please provide a valid User ID. \nInput: ${userID}`);

  try {
    // Fetch the ban list and find the user
    const banList = await interaction.guild.fetchBans();
    const bannedUser = banList.find((user) => user.id === userID);

    if (!bannedUser) return interaction.editReply(`The user with the ID ${userID} is not banned.`);

    const unbanP = await interaction.guild.members.unban(userID, { reason }).catch((err) => {
      return interaction.editReply(`An error occurred: ${err}`);
    });

    const [logRows] = await interaction.client.db.execute(
      /* sql */ `
        SELECT
          channel_id,
          member_banned,
          no_log_channels
        FROM
          log_settings
        WHERE
          server_id = ?
      `,
      [interaction.guild.id],
    );
    const logChannelID = logRows[0].channel_id;
    const logSystem = logRows[0].member_banned;

    const embed = new EmbedBuilder()
      .setTitle('Member Unbanned')
      .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
      .setColor(successColor)
      .addFields([
        { name: 'User', value: unbanP.toString() },
        { name: 'Unbanned By', value: interaction.member.toString() },
        { name: 'Reason', value: reason },
      ])
      .setFooter({ text: `ID: ${unbanP.id}` })
      .setTimestamp();

    if (logRows.length && logChannelID && logSystem === 1) {
      const em2 = new EmbedBuilder()
        .setTitle('User unbanned')
        .setColor(successColor)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
        .setDescription('Full info posted in the log channel.');

      interaction.guild.channels.cache.get(logChannelID).send({ embeds: [embed] });
      return interaction.editReply({ embeds: [em2] });
    } else {
      return interaction.editReply({ embeds: [embed] });
    }
  } catch (err) {
    return interaction.editReply(`An error occurred: ${err}`);
  }
};
