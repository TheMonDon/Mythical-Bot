const { EmbedBuilder } = require('discord.js');
const NekoLife = require('nekos.life');
const neko = new NekoLife();

// Set guildOnly to true if you want it to be available on guilds only.
// Otherwise false is global.
exports.conf = {
  permLevel: 'User',
  guildOnly: false,
};

exports.commandData = {
  name: '8ball',
  description: 'Ask the 8ball a question.',
  options: [
    {
      type: 3,
      name: 'question',
      description: 'The question you want to ask the 8ball.',
      required: true,
    },
  ],
  dmPermission: true,
};

exports.run = async (client, interaction) => {
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
