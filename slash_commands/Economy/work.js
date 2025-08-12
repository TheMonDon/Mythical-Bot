const { EmbedBuilder, SlashCommandBuilder, InteractionContextType } = require('discord.js');
const { QuickDB } = require('quick.db');
const moment = require('moment');
const db = new QuickDB();

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('work')
  .setContexts(InteractionContextType.Guild)
  .setDescription('Work for some extra money');

exports.run = async (interaction) => {
  await interaction.deferReply();
  const cooldown = (await db.get(`servers.${interaction.guild.id}.economy.work.cooldown`)) || 300; // get cooldown from database or set to 300 seconds

  const connection = await interaction.client.db.getConnection();
  const [userCooldownRows] = await connection.execute(
    /* sql */ `
      SELECT
        *
      FROM
        cooldowns
      WHERE
        user_id = ?
        AND cooldown_name = 'work'
        AND expires_at > NOW()
    `,
    [interaction.user.id],
  );
  const expiresAt = userCooldownRows[0]?.expires_at;

  const embed = new EmbedBuilder()
    .setColor(interaction.settings.embedErrorColor)
    .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() });

  // Check if the user is on cooldown
  if (expiresAt) {
    const timeleft = new Date(expiresAt) - Date.now();
    if (timeleft > 0 && timeleft <= cooldown * 1000) {
      const tLeft = moment
        .duration(timeleft)
        .format('y[ years][,] M[ Months][,] d[ days][,] h[ hours][,] m[ minutes][ and] s[ seconds]');
      embed.setDescription(`Please wait ${tLeft} to work again.`);

      connection.release();
      return interaction.editReply({ embeds: [embed] });
    }
  }

  const min = parseFloat((await db.get(`servers.${interaction.guild.id}.economy.work.min`)) || 50);
  const max = parseFloat((await db.get(`servers.${interaction.guild.id}.economy.work.max`)) || 500);

  const amount = Math.abs(Math.floor(Math.random() * (max - min + 1) + min));
  const currencySymbol = (await db.get(`servers.${interaction.guild.id}.economy.symbol`)) || '$';
  const csamount = currencySymbol + amount.toLocaleString();

  delete require.cache[require.resolve('../../resources/messages/work_jobs.json')];
  const jobs = require('../../resources/messages/work_jobs.json');

  const num = Math.floor(Math.random() * (jobs.length - 1)) + 1;
  const job = jobs[num].replace('{amount}', csamount);

  await connection.execute(
    /* sql */ `
      INSERT INTO
        cooldowns (guild_id, user_id, cooldown_name, expires_at)
      VALUES
        (?, ?, ?, NOW() + INTERVAL ? SECOND) ON DUPLICATE KEY
      UPDATE expires_at =
      VALUES
        (expires_at)
    `,
    [interaction.guild.id, interaction.user.id, 'work', cooldown],
  );

  connection.release();

  const oldBalance = BigInt(
    (await db.get(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.cash`)) ||
      (await db.get(`servers.${interaction.guild.id}.economy.startBalance`)) ||
      0,
  );

  const newBalance = oldBalance + BigInt(amount);
  await db.set(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.cash`, newBalance.toString());

  embed
    .setColor(interaction.settings.embedSuccessColor)
    .setDescription(job)
    .setFooter({ text: `Reply #${num.toLocaleString()}` });

  return interaction.editReply({ embeds: [embed] });
};
