/* eslint-disable prefer-regex-literals */
const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const fetch = require('node-superfetch');

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('minecraft-account')
  .setDescription('View information about a Minecraft account')
  .addStringOption((option) =>
    option.setName('username').setDescription('The username of the Minecraft account').setRequired(true),
  );

exports.run = async (interaction) => {
  await interaction.deferReply();
  const errorColor = interaction.settings.embedErrorColor;
  const successColor = interaction.settings.embedSuccessColor;
  const name = interaction.options.getString('username');

  const nameRegex = new RegExp(/^\w{3,16}$/);
  // Make sure the username is a valid MC username
  if (!nameRegex.test(name)) {
    const em = new EmbedBuilder()
      .setTitle('Invalid Username')
      .setColor(errorColor)
      .setDescription(`\`${name}\` is not a valid minecraft username.`);
    return interaction.editReply({ embeds: [em] });
  }

  try {
    const body = await fetch.get(`https://api.mojang.com/users/profiles/minecraft/${name}`);
    const id = body.body.id;
    const realName = body.body.name;

    const em = new EmbedBuilder()
      .setTitle(`${realName}'s Account Information`)
      .setColor(successColor)
      .setImage(`https://mc-heads.net/body/${id}`)
      .addFields([
        { name: 'UUID', value: id.toString(), inline: false },
        {
          name: 'NameMC Link',
          value: `Click [here](https://namemc.com/profile/${id}) to go to their NameMC Profile`,
          inline: false,
        },
      ]);

    return interaction.editReply({ embeds: [em] });
  } catch (err) {
    const em = new EmbedBuilder()
      .setTitle('Account Not Found')
      .setColor(errorColor)
      .setDescription(`An account with the name \`${name}\` was not found.`);
    return interaction.editReply({ embeds: [em] });
  }
};
