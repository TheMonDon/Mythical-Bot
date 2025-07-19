const { EmbedBuilder, SlashCommandBuilder, InteractionContextType, MessageFlags } = require('discord.js');
const { QuickDB } = require('quick.db');
const moment = require('moment');
const db = new QuickDB();

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
  const caseID = interaction.options.getString('case_id');
  const warn = await db.get(`servers.${interaction.guild.id}.warns.warnings.${caseID}`);

  if (!warn) return interaction.editReply("I couldn't find any case with that ID.");

  const { mod, points, reason, user, timestamp, messageURL } = warn;
  const victim = await interaction.client.users.fetch(user);
  const moderator = await interaction.client.users.fetch(mod);

  const em = new EmbedBuilder()
    .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
    .setColor(interaction.settings.embedColor)
    .addFields([
      { name: 'Case ID', value: caseID.toString(), inline: true },
      { name: 'User', value: victim.toString(), inline: true },
      { name: 'Points', value: points.toString(), inline: true },
      { name: 'Moderator', value: moderator.toString(), inline: true },
      { name: 'Warned on', value: moment(timestamp).format('LLL'), inline: true },
      { name: 'Message URL', value: messageURL, inline: true },
      { name: 'Reason', value: reason, inline: false },
    ]);
  return interaction.editReply({ embeds: [em] });
};
