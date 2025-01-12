const { EmbedBuilder, SlashCommandBuilder, MessageFlags, InteractionContextType } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

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
  let title = 'Case Cleared';
  let color = interaction.settings.embedColor;

  const caseID = interaction.options.getString('case_id');
  const warning = await db.get(`servers.${interaction.guild.id}.warns.warnings.${caseID}`);

  if (!warning) return interaction.client.util.errorEmbed(interaction, 'No warning case found', 'Invalid Case ID');

  const logChan = await db.get(`servers.${interaction.guild.id}.warns.channel`);
  const userID = warning.user;
  const user = await interaction.client.users.fetch(userID);
  const warnReason = warning.reason || '???';

  if (!user) return interaction.client.util.errorEmbed(interaction, 'User not found', 'Invalid User');

  const previousPoints = interaction.client.util.getTotalPoints(userID, interaction);
  await db.delete(`servers.${interaction.guild.id}.warns.warnings.${caseID}`);
  const newerPoints = interaction.client.util.getTotalPoints(userID, interaction);

  if (previousPoints >= 10 && newerPoints < 10) {
    if (!interaction.guild.members.me.permissions.has('BanMembers')) {
      interaction.client.util.errorEmbed(
        interaction,
        'Please unban the user manually, the bot does not have Ban Members permission.',
        'Missing Permission',
      );
    } else {
      await interaction.guild.members.unban(userID).catch(() => null);
      title += ' & User Unbanned';
      color = interaction.settings.embedSuccessColor;
    }
  }

  const userEmbed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .addFields([
      { name: 'Moderator', value: `${interaction.user} (${interaction.user.id})`, inline: true },
      { name: 'Deleted Case', value: `\`${caseID}\``, inline: true },
      { name: 'Case Reason', value: warnReason, inline: true },
      { name: 'Issued In', value: interaction.guild.name, inline: true },
    ]);
  const userMessage = await user.send({ embeds: [userEmbed] }).catch(() => null);

  const logEmbed = new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .addFields([
      { name: 'Moderator', value: `${interaction.user} (${interaction.user.id})`, inline: true },
      { name: 'User', value: `${user} (${user.id})`, inline: true },
      { name: 'Deleted Case', value: `\`${caseID}\``, inline: true },
      { name: 'Case Reason', value: warnReason, inline: true },
    ]);
  if (!userMessage) logEmbed.setFooter({ text: 'Failed to send a DM to the user. (User has DMs disabled)' });

  if (logChan) {
    const channelEmbed = new EmbedBuilder()
      .setTitle(title)
      .setColor(color)
      .addFields([
        { name: 'User', value: `${user} (${user.id})`, inline: true },
        { name: 'Deleted Case', value: `\`${caseID}\``, inline: true },
      ]);

    interaction.guild.channel.send({ embeds: [channelEmbed] }).then((embed) => {
      setTimeout(() => embed.delete(), 30000);
    });

    await interaction.editReply('Warnings Cleared');
    return interaction.guild.channels.cache.get(logChan).send({ embeds: [logEmbed] });
  } else {
    return interaction.editReply({ embeds: [logEmbed] });
  }
};
