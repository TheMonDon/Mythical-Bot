const { EmbedBuilder, SlashCommandBuilder, InteractionContextType } = require('discord.js');
const { Duration } = require('luxon');

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('work')
  .setContexts(InteractionContextType.Guild)
  .setDescription('Work for some extra money');

exports.run = async (interaction) => {
  await interaction.deferReply();

  const [cooldownRows] = await interaction.client.db.execute(
    /* sql */ `
      SELECT
        duration
      FROM
        cooldown_settings
      WHERE
        server_id = ?
        AND cooldown_name = 'work'
    `,
    [interaction.guild.id],
  );
  const cooldown = cooldownRows[0]?.duration || 300;

  const [userCooldownRows] = await interaction.client.db.execute(
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
      const tLeft = Duration.fromMillis(timeleft)
        .shiftTo('years', 'months', 'days', 'hours', 'minutes', 'seconds')
        .toHuman({ maximumFractionDigits: 2, showZeros: false });

      embed.setDescription(`Please wait ${tLeft} to work again.`);

      return interaction.editReply({ embeds: [embed] });
    }
  }

  const [economyRows] = await interaction.client.db.execute(
    /* sql */ `
      SELECT
        *
      FROM
        economy_settings
      WHERE
        server_id = ?
    `,
    [interaction.guild.id],
  );

  const min = economyRows[0]?.work_min || 20;
  const max = economyRows[0]?.work_max || 250;

  const currencySymbol = economyRows[0]?.symbol || '$';
  const amount = Math.abs(Math.floor(Math.random() * (max - min + 1) + min));
  const csamount = currencySymbol + amount.toLocaleString();

  delete require.cache[require.resolve('../../resources/messages/work_jobs.json')];
  const jobs = require('../../resources/messages/work_jobs.json');

  const num = Math.floor(Math.random() * (jobs.length - 1)) + 1;
  const job = jobs[num].replace('{amount}', csamount);

  await interaction.client.db.execute(
    /* sql */ `
      INSERT INTO
        cooldowns (server_id, user_id, cooldown_name, expires_at)
      VALUES
        (?, ?, ?, NOW() + INTERVAL ? SECOND) ON DUPLICATE KEY
      UPDATE expires_at =
      VALUES
        (expires_at)
    `,
    [interaction.guild.id, interaction.user.id, 'work', cooldown],
  );

  await interaction.client.db.execute(
    /* sql */
    `
      INSERT INTO
        economy_balances (server_id, user_id, cash)
      VALUES
        (?, ?, ?) ON DUPLICATE KEY
      UPDATE cash = cash +
      VALUES
        (cash)
    `,
    [interaction.guild.id, interaction.member.id, amount.toString()],
  );

  embed
    .setColor(interaction.settings.embedSuccessColor)
    .setDescription(job)
    .setFooter({ text: `Reply #${num.toLocaleString()}` });

  return interaction.editReply({ embeds: [embed] });
};
