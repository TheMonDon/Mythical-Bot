const { SlashCommandBuilder, InteractionContextType } = require('discord.js');

exports.conf = {
  permLevel: 'Moderator',
};

exports.commandData = new SlashCommandBuilder()
  .setName('nickname')
  .setContexts(InteractionContextType.Guild)
  .setDescription('Change a users nickname')
  .addUserOption((option) =>
    option.setName('user').setDescription('The user you want to change the nickname of').setRequired(true),
  )
  .addStringOption((option) => option.setName('nickname').setDescription('The nickname to change to'));

exports.run = async (interaction) => {
  await interaction.deferReply();

  if (!interaction.guild.members.me.permissions.has('ManageNicknames'))
    return interaction.editReply("The bot doesn't have Manage Nicknames permission.");

  const user = interaction.options.getUser('user');
  const infoMem = await interaction.client.util.getMember(interaction, user.id);
  const owner = await interaction.guild.fetchOwner();

  if (infoMem.id === owner.user.id)
    return interaction.editReply('Only the owner of the server can change their nickname.');
  if (infoMem.roles.highest.position > interaction.guild.members.me.roles.highest.position - 1)
    return interaction.editReply('I need my role higher to change that users nickname.');
  if (infoMem.roles.highest.position > interaction.member.roles.highest.position - 1) {
    return interaction.editReply('You cannot change the nickname of someone with a higher role than you.');
  }

  const nick = interaction.options.getString('nickname');

  if (nick) {
    const oldNick = infoMem.nickname || infoMem.user.username;
    await infoMem.setNickname(nick);
    return interaction.editReply(`Changed old nickname \`${oldNick}\` to \`${nick}\``);
  }

  await infoMem.setNickname('');
  return interaction.editReply(`Reset the nickname of ${infoMem.user.username}`);
};
