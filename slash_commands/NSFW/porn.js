const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const trev = require('trev-reborn');

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('porn')
  .setDescription('Get porn images from reddit')
  .setNSFW(true)
  .addStringOption(
    (option) =>
      option
        .setName('type')
        .setDescription('The type of porn')
        .setRequired(true)
        .addChoices(
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
          { name: 'Large Penis', value: 'largepenis' },
          { name: 'Lesbian', value: 'lesbian' },
          { name: 'Men', value: 'men' },
          { name: 'Milf', value: 'milf' },
          { name: 'Positions', value: 'positions' },
          { name: 'Pussy', value: 'pussy' },
          { name: 'Thong', value: 'thong' },
        ), // Currently at 19/25
  );

exports.run = async (interaction) => {
  await interaction.deferReply();

  const type = interaction.options.get('type').value;

  const post = await trev.nsfw[type]();
  if (!post)
    return interaction.client.util.errorEmbed(interaction, 'Failed to fetch a post from reddit. Please try again');

  const authorName = interaction.user.discriminator === '0' ? interaction.user.username : interaction.user.tag;
  const embed = new EmbedBuilder()
    .setAuthor({ name: authorName, iconURL: interaction.user.displayAvatarURL() })
    .setColor(interaction.settings.embedColor)
    .setTitle(post.title)
    .setURL(post.permalink)
    .setImage(post.media)
    .setTimestamp();

  if (trev.isRedGifsLink(post.media)) {
    return interaction.editReply(post.media);
  } else {
    return interaction.editReply({ embeds: [embed] });
  }
};
