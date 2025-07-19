const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('avatar')
  .setDescription('Get a users avatar')
  .addUserOption((option) => option.setName('user').setDescription('The user to get the avatar of').setRequired(false));

exports.run = async (interaction) => {
  await interaction.deferReply();

  let infoUser = interaction.user;
  let infoMember = interaction.member;

  const targetUser = interaction.options.getUser('user');
  const targetMember = interaction.options.getMember?.('user'); // May return null if user isn't in the guild

  if (targetUser) {
    infoUser = targetUser;
    infoMember = targetMember;
  }

  const avatarURL = infoMember?.displayAvatarURL
    ? infoMember.displayAvatarURL({ size: 4096, extension: 'png', forceStatic: false }) // Guild avatar
    : infoUser.displayAvatarURL({ size: 4096, extension: 'png', forceStatic: false }); // Global avatar

  const embed = new EmbedBuilder()
    .setTitle(`${infoUser.username}'s Avatar`)
    .setColor(interaction.settings.embedColor)
    .setAuthor({
      name: interaction.user.displayName ?? interaction.user.username,
      iconURL: interaction.user.displayAvatarURL(),
    })
    .setImage(avatarURL);

  return interaction.editReply({ embeds: [embed] });
};
