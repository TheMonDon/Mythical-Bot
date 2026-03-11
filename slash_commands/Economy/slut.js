const { EmbedBuilder, SlashCommandBuilder, InteractionContextType } = require('discord.js');
const { Duration } = require('luxon');

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('slut')
  .setContexts(InteractionContextType.Guild)
  .setDescription('Whip it out, for some quick cash ;)');

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
        AND cooldown_name = 'slut'
    `,
    [interaction.guild.id],
  );
  const cooldown = cooldownRows[0]?.duration || 600;

  const [userCooldownRows] = await interaction.client.db.execute(
    /* sql */ `
      SELECT
        *
      FROM
        cooldowns
      WHERE
        user_id = ?
        AND cooldown_name = 'slut'
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
      const timeLeftDuration = Duration.fromMillis(timeleft).shiftTo(
        'years',
        'months',
        'days',
        'hours',
        'minutes',
        'seconds',
      );
      const roundedTimeLeftDuration = timeLeftDuration.set({ seconds: Math.floor(timeLeftDuration.seconds) });
      const tLeft = roundedTimeLeftDuration.toHuman({ showZeros: false });

      embed.setDescription(`Please wait ${tLeft} to be a slut again.`);

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

  const [balanceRows] = await interaction.client.db.execute(
    /* sql */ `
      SELECT
        cash,
        bank
      FROM
        economy_balances
      WHERE
        server_id = ?
        AND user_id = ?
    `,
    [interaction.guild.id, interaction.member.id],
  );

  const cash = BigInt(balanceRows[0].cash || economyRows[0]?.start_balance || 0);
  const bank = BigInt(balanceRows[0].bank || 0);
  const authNet = cash + bank;

  const min = economyRows[0]?.slut_min || 100;
  const max = economyRows[0]?.slut_max || 400;

  // Get the min and max fine percentages
  const minFine = economyRows[0]?.slut_fine_min || 10;
  const maxFine = economyRows[0]?.slut_fine_max || 20;

  // randomFine is a random number between the minimum and maximum fail rate
  const randomFine = BigInt(Math.abs(Math.round(Math.random() * (maxFine - minFine + 1) + minFine)));

  // fineAmount is the amount of money the user will lose if they fail the action
  const fineAmount = interaction.client.util.bigIntAbs((authNet / BigInt(100)) * randomFine);

  // failRate is the percentage chance of the user failing the action
  const failRate = economyRows[0]?.slut_fail_rate || 35;
  const ranNum = Math.random() * 100;

  const currencySymbol = economyRows[0]?.symbol || '$';

  if (ranNum < failRate) {
    delete require.cache[require.resolve('../../resources/messages/slut_fail.json')];
    const slutFail = require('../../resources/messages/slut_fail.json');

    const csAmount = currencySymbol + fineAmount.toLocaleString();
    const num = Math.floor(Math.random() * (slutFail.length - 1)) + 1;
    const txt = slutFail[num].replace('{amount}', csAmount);

    embed.setDescription(txt).setFooter({ text: `Reply #${num.toLocaleString()}` });

    await interaction.editReply({ embeds: [embed] });

    await interaction.client.db.execute(
      /* sql */
      `
        INSERT INTO
          economy_balances (server_id, user_id, cash)
        VALUES
          (?, ?, ?) ON DUPLICATE KEY
        UPDATE cash = cash -
        VALUES
          (cash)
      `,
      [interaction.guild.id, interaction.member.id, fineAmount.toString()],
    );
  } else {
    delete require.cache[require.resolve('../../resources/messages/slut_success.json')];
    const slutSuccess = require('../../resources/messages/slut_success.json');

    const amount = BigInt(Math.abs(Math.floor(Math.random() * (max - min + 1) + min)));
    const csAmount = currencySymbol + amount.toLocaleString();

    const num = Math.floor(Math.random() * (slutSuccess.length - 1)) + 1;
    const txt = slutSuccess[num].replace('{amount}', csAmount);

    embed
      .setDescription(txt)
      .setColor(interaction.settings.embedSuccessColor)
      .setFooter({ text: `Reply #${num.toLocaleString()}` });

    await interaction.editReply({ embeds: [embed] });

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
  }

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
    [interaction.guild.id, interaction.user.id, 'slut', cooldown],
  );
};
