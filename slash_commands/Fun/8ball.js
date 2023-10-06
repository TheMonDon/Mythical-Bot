const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const NekoLife = require('nekos.life');
const neko = new NekoLife();

exports.conf = {
  permLevel: 'User',
  guildOnly: false,
};

exports.commandData = new SlashCommandBuilder()
  .setName('8ball')
  .setDescription('Ask the 8ball a question')
  .addStringOption((option) =>
    option.setName('question').setDescription('The question to ask the 8ball').setRequired(true),
  );

exports.run = async (interaction) => {
  await interaction.deferReply();

  const question = interaction.options.get('question').value;

  const out = await neko.eightBall({ text: question });

  const em = new EmbedBuilder()
    .setTitle('Eight Ball')
    .setColor(interaction.settings.embedColor)
    .setImage(out.url)
    .addFields([{ name: '__Question:__', value: question, inline: false }]);

  return interaction.editReply({ embeds: [em] });
};
