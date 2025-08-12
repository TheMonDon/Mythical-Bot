const { EmbedBuilder, SlashCommandBuilder, InteractionContextType } = require('discord.js');
const { QuickDB } = require('quick.db');
const moment = require('moment');
const db = new QuickDB();

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('slut')
  .setContexts(InteractionContextType.Guild)
  .setDescription('Whip it out, for some quick cash ;)');

exports.run = async (interaction) => {
  await interaction.deferReply();
  const connection = await interaction.client.db.getConnection();
  const type = 'slut';

  const cooldown = (await db.get(`servers.${interaction.guild.id}.economy.${type}.cooldown`)) || 600;

  const [userCooldownRows] = await connection.execute(
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
      const tLeft = moment
        .duration(timeleft)
        .format('y[ years][,] M[ Months][,] d[ days][,] h[ hours][,] m[ minutes][ and] s[ seconds]');
      embed.setDescription(`Please wait ${tLeft} to be a slut again.`);

      connection.release();
      return interaction.editReply({ embeds: [embed] });
    }
  }

  const cash = BigInt(
    (await db.get(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.cash`)) ||
      (await db.get(`servers.${interaction.guild.id}.economy.startBalance`)) ||
      0,
  );
  const bank = BigInt(
    (await db.get(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.bank`)) || 0,
  );
  const authNet = cash + bank;

  const min = (await db.get(`servers.${interaction.guild.id}.economy.${type}.min`)) || 500;
  const max = (await db.get(`servers.${interaction.guild.id}.economy.${type}.max`)) || 2000;

  // Get the min and max fine percentages
  const minFine = (await db.get(`servers.${interaction.guild.id}.economy.${type}.fine.min`)) || 10;
  const maxFine = (await db.get(`servers.${interaction.guild.id}.economy.${type}.fine.max`)) || 30;

  // randomFine is a random number between the minimum and maximum fail rate
  const randomFine = BigInt(Math.abs(Math.round(Math.random() * (maxFine - minFine + 1) + minFine)));

  // fineAmount is the amount of money the user will lose if they fail the action
  const fineAmount = interaction.client.util.bigIntAbs((authNet / BigInt(100)) * randomFine);

  // failRate is the percentage chance of the user failing the action
  const failRate = (await db.get(`servers.${interaction.guild.id}.economy.${type}.failrate`)) || 35;
  const ranNum = Math.random() * 100;

  const currencySymbol = (await db.get(`servers.${interaction.guild.id}.economy.symbol`)) || '$';

  delete require.cache[require.resolve('../../resources/messages/slut_success.json')];
  delete require.cache[require.resolve('../../resources/messages/slut_fail.json')];
  const crimeSuccess = require('../../resources/messages/slut_success.json');
  const crimeFail = require('../../resources/messages/slut_fail.json');

  if (ranNum < failRate) {
    const csamount = currencySymbol + fineAmount.toLocaleString();
    const num = Math.floor(Math.random() * (crimeFail.length - 1)) + 1;
    const txt = crimeFail[num].replace('{amount}', csamount);

    embed.setDescription(txt).setFooter({ text: `Reply #${num.toLocaleString()}` });

    await interaction.editReply({ embeds: [embed] });

    const newAmount = cash - fineAmount;
    await db.set(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.cash`, newAmount.toString());
  } else {
    const amount = BigInt(Math.abs(Math.floor(Math.random() * (max - min + 1) + min)));
    const csamount = currencySymbol + amount.toLocaleString();

    const num = Math.floor(Math.random() * (crimeSuccess.length - 1)) + 1;
    const txt = crimeSuccess[num].replace('{amount}', csamount);

    embed
      .setDescription(txt)
      .setColor(interaction.settings.embedSuccessColor)
      .setFooter({ text: `Reply #${num.toLocaleString()}` });

    await interaction.editReply({ embeds: [embed] });

    const newAmount = cash + amount;
    await db.set(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.cash`, newAmount.toString());
  }

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
    [interaction.guild.id, interaction.user.id, 'slut', cooldown],
  );

  connection.release();
};
