const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const trev = require('trev-reborn');

exports.conf = {
  permLevel: 'User',
  guildOnly: false,
};

exports.commandData = new SlashCommandBuilder()
  .setName('porn')
  .setDescription('Get porn images from reddit')
  .setNSFW(true)
  .addStringOption((option) =>
    option.setName('type').setDescription('The type of porn').setRequired(true).addChoices(
      { name: 'Ass', value: 'ass' },
      { name: 'BDSM', value: 'bdsm' },
      { name: 'Bikinis', value: 'bikinis' },
      { name: 'Boobs', value: 'boobs' },
      { name: 'Cuck', value: 'cuck' },
      { name: 'Cum', value: 'cum' },
      { name: 'Dildo', value: 'dildo' },
      { name: 'Feet', value: 'feet' },
      { name: 'Ginger', value: 'ginger' },
      { name: 'Gonewild', value: 'gonewild' },
      { name: 'Hair', value: 'hair' },
      { name: 'Hentai', value: 'hentai' },
      { name: 'Lesbian', value: 'lesbian' },
      { name: 'Men', value: 'men' },
      { name: 'Milf', value: 'milf' },
      { name: 'Pussy', value: 'pussy' },
      { name: 'Thong', value: 'thong' }, // Currently at 17/25
    ),
  );

exports.run = async (interaction) => {
  await interaction.deferReply();

  const type = interaction.options.get('type').value;

  const post = await trev.nsfw[type]();

  const authorName = interaction.user.discriminator === '0' ? interaction.user.username : interaction.user.tag;
  const embed = new EmbedBuilder()
    .setAuthor({ name: authorName, iconURL: interaction.user.displayAvatarURL() })
    .setColor(interaction.settings.embedColor)
    .setTitle(post.title)
    .setURL(post.permalink)
    .setImage(post.media)
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
};
