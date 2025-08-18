const { EmbedBuilder, SlashCommandBuilder, InteractionContextType, MessageFlags } = require('discord.js');

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('warnings')
  .setContexts(InteractionContextType.Guild)
  .setDescription('View your warnings, or moderators can view other warnings.')
  .addUserOption((option) => option.setName('user').setDescription('The user to view warnings of'));

exports.run = async (interaction, level) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const connection = await interaction.client.db.getConnection();

  const user = interaction.options.getUser('user');
  const warns = [];
  let mem;

  try {
    if (!user) {
      mem = interaction.member;
    } else {
      mem = await interaction.client.util.getMember(interaction, user.id);
      if (!mem) mem = interaction.member;
      mem = level > 1 ? mem : interaction.member;
    }

    const [otherWarns] = await connection.execute(
      /* sql */
      `
        SELECT
          *
        FROM
          warns
        WHERE
          server_id = ?
          AND user_id = ?
        ORDER BY
          timestamp ASC
      `,
      [interaction.guild.id, mem.id],
    );

    const [[pointsRow]] = await connection.execute(
      /* sql */
      `
        SELECT
          COALESCE(SUM(points), 0) AS totalPoints
        FROM
          warns
        WHERE
          server_id = ?
          AND user_id = ?
      `,
      [interaction.user.id, mem.id],
    );

    const totalPoints = Number(pointsRow.totalPoints);

    if (otherWarns) {
      let otherCases = otherWarns.length > 0 ? otherWarns.map((w) => `\`${w.warn_id}\``).join(', ') : 'No other cases.';
      if (!otherCases) otherCases = 'No other Cases';

      for (const data of otherWarns) {
        const unixTimestamp = Math.floor(Number(data.timestamp) / 1000);

        warns.push(
          `\`${data.warn_id}\` - ${data.points} pts - ${interaction.client.util.limitStringLength(data.reason, 0, 24)} - ` +
            `<t:${unixTimestamp}:f>`,
        );
      }
    }

    mem = mem.user ? mem.user : mem;
    const maxWarnings = 60;
    const cappedWarns = warns.slice(0, maxWarnings).join('\n');
    const overflowMessage = warns.length > maxWarnings ? `\n...and ${warns.length - maxWarnings} more warnings.` : '';
    const embedContent = cappedWarns + overflowMessage;

    const embed = new EmbedBuilder()
      .setAuthor({ name: mem.username, iconURL: mem.displayAvatarURL() })
      .setColor('#FFA500')
      .setTitle(`Total Warning Points: ${totalPoints}`)
      .setDescription(warns.length ? embedContent : 'This user is squeaky clean.');

    return interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.log('Warnings Error:', error);
    return interaction.editReply(`An error occurred: ${error.message}`);
  } finally {
    connection.release();
  }
};
