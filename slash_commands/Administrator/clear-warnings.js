const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

exports.conf = {
  permLevel: 'Administrator',
  guildOnly: true,
};

exports.commandData = new SlashCommandBuilder()
  .setName('clear-warnings')
  .setDescription('Clear all the warnings of the specific user.')
  .addUserOption((option) => option.setName('user').setDescription('The user to clear warnings from').setRequired(true))
  .setDMPermission(false);

exports.run = async (interaction) => {
  await interaction.deferReply();
  const mem = interaction.options.getUser('user');
  const color = interaction.settings.embedColor;

  const otherWarns = await interaction.client.util.getWarns(mem.id, interaction);
  const previousPoints = await interaction.client.util.getTotalPoints(mem.id, interaction);
  const logChan = await db.get(`servers.${interaction.guild.id}.warns.channel`);

  if (!otherWarns || otherWarns.length < 1) return interaction.client.util.errorEmbed(interaction, 'That user has no warnings.');

  for (const i of otherWarns) {
    await db.delete(`servers.${interaction.guild.id}.warns.warnings.${i.warnID}`);
  }

  if (previousPoints >= 10) {
    if (!interaction.guild.members.me.permissions.has('BanMembers')) {
      interaction.client.util.errorEmbed(
        interaction,
        'Please unban the user manually, the bot does not have Ban Members permission.',
        'Missing Permission',
      );
    } else {
      await interaction.guild.members.unban(mem.id).catch(() => null);
    }
  }

  const otherCases = otherWarns.map((w) => `\`${w.warnID}\``).join(', ');
  const username = interaction.user.discriminator === '0' ? interaction.user.username : interaction.user.tag;

  const userEmbed = new EmbedBuilder()
    .setDescription('Warnings Cleared')
    .setColor(color)
    .addFields([
      { name: 'Moderator', value: `${username} (${interaction.user.id})`, inline: true },
      { name: 'Cleared Cases', value: otherCases, inline: true },
      { name: 'Issued In', value: interaction.guild.name, inline: true },
    ]);
  const userMessage = await mem.send({ embeds: [userEmbed] }).catch(() => null);

  const logEmbed = new EmbedBuilder()
    .setTitle('Warnings Cleared')
    .setColor(color)
    .addFields([
      { name: 'Moderator', value: `${username} (${interaction.user.id})`, inline: true },
      { name: 'User', value: `${mem} (${mem.id})`, inline: true },
      { name: 'Cleared Cases', value: otherCases, inline: true },
    ]);
  if (!userMessage) logEmbed.setFooter({ text: 'Failed to send a DM to the user. (User has DMs disabled)' });

  if (logChan) {
    const channelEmbed = new EmbedBuilder()
      .setTitle('Warnings Cleared')
      .setColor(color)
      .addFields([
        { name: 'User', value: `${mem} (${mem.id})` },
        { name: 'Cleared Cases', value: otherCases },
      ]);

    interaction.channel.send({ embeds: [channelEmbed] }).then((embed) => {
      setTimeout(() => embed.delete(), 30000);
    });

    return interaction.guild.channels.cache.get(logChan).send({ embeds: [logEmbed] });
  } else {
    return interaction.editReply({ embeds: [logEmbed] });
  }
};
