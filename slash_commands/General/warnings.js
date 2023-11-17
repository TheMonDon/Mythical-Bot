const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const moment = require('moment');
const db = new QuickDB();

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('warnings')
  .setDescription('View your warnings, or moderators can view other warnings.')
  .addUserOption((option) => option.setName('user').setDescription('The user to view warnings of'));

exports.run = async (interaction) => {
  await interaction.deferReply({ ephemeral: true });
  const user = interaction.options.getUser('user');
  const level = interaction.user.permLevel;
  const warns = [];
  let mem;

  if (!user) {
    mem = interaction.user;
  } else {
    mem = await interaction.client.util.getMember(interaction, user.id);
    if (!mem) mem = interaction.user;
    mem = level > 0 ? mem : interaction.user;
  }

  const otherWarns = await interaction.client.util.getWarns(mem.id, interaction);
  const totalPoints = await interaction.client.util.getTotalPoints(mem.id, interaction);

  if (otherWarns) {
    let otherCases = otherWarns.length > 0 ? otherWarns.map((w) => `\`${w.warnID}\``).join(', ') : 'No other cases.';
    if (!otherCases) otherCases = 'No other Cases';

    for (const i of otherWarns) {
      const data = await db.get(`servers.${interaction.guild.id}.warns.warnings.${i.warnID}`);
      warns.push(
        `\`${i.warnID}\` - ${data.points} pts - ${interaction.client.util.limitStringLength(data.reason, 0, 24)} - ` +
          `${moment(Number(data.timestamp)).format('LLL')}`,
      );
    }
  }

  mem = mem.user ? mem.user : mem;
  const em = new EmbedBuilder()
    .setAuthor({ name: mem.username, iconURL: mem.displayAvatarURL() })
    .setColor('#FFA500')
    .setTitle(`Total Warning Points: ${totalPoints}`)
    .setDescription(warns.length ? warns.join('\n') : 'This user is squeaky clean.');
  return interaction.editReply({ embeds: [em] });
};
