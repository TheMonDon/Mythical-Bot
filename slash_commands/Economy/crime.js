const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const moment = require('moment');
const db = new QuickDB();

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('crime')
  .setDMPermission(false)
  .setDescription('Commit a crime for a chance at some extra money');

exports.run = async (interaction) => {
  await interaction.deferReply();
  const type = 'crime';

  const cooldown = (await db.get(`servers.${interaction.guild.id}.economy.${type}.cooldown`)) || 600;
  let userCooldown =
    (await db.get(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.${type}.cooldown`)) || {};

  const embed = new EmbedBuilder()
    .setColor(interaction.settings.embedErrorColor)
    .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

  // Check if the user is on cooldown
  if (userCooldown.active) {
    const timeleft = userCooldown.time - Date.now();
    if (timeleft < 1 || timeleft > cooldown * 1000) {
      // this is to check if the bot restarted before their cooldown was set.
      userCooldown = {};
      userCooldown.active = false;
      await db.set(
        `servers.${interaction.guild.id}.users.${interaction.member.id}.economy.${type}.cooldown`,
        userCooldown,
      );
    } else {
      const timeLeft = moment
        .duration(timeleft)
        .format('y[ years][,] M[ Months]d[ days][,] h[ hours][,] m[ minutes][, and] s[ seconds]'); // format to any format
      embed.setDescription(`You cannot commit a crime for ${timeLeft}`);
      return interaction.editReply({ embeds: [embed] });
    }
  }

  // Get the user's net worth
  const cash = BigInt(
    (await db.get(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.cash`)) ||
      (await db.get(`servers.${interaction.guild.id}.economy.startBalance`)) ||
      0,
  );
  const bank = BigInt(
    (await db.get(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.bank`)) || 0,
  );
  const authNet = cash + bank;

  // Get the min and max amounts of money the user can get
  const min = (await db.get(`servers.${interaction.guild.id}.economy.${type}.min`)) || 500;
  const max = (await db.get(`servers.${interaction.guild.id}.economy.${type}.max`)) || 2000;

  // Get the min and max fine percentages
  const minFine = (await db.get(`servers.${interaction.guild.id}.economy.${type}.fine.min`)) || 10;
  const maxFine = (await db.get(`servers.${interaction.guild.id}.economy.${type}.fine.max`)) || 30;

  // randomFine is a random number between the minimum and maximum fail rate
  const randomFine = BigInt(Math.abs(Math.round(Math.random() * (maxFine - minFine + 1) + minFine)));

  // fineAmount is the amount of money the user will lose if they fail the action
  let fineAmount = (authNet / BigInt(100)) * randomFine;

  // Prevent negative fine or fine greater than user's cash
  if (authNet < BigInt(0) || BigInt(fineAmount) > authNet) {
    fineAmount = BigInt(0);
  }

  const failRate = (await db.get(`servers.${interaction.guild.id}.economy.${type}.failrate`)) || 45;
  const ranNum = Math.random() * 100;

  const currencySymbol = (await db.get(`servers.${interaction.guild.id}.economy.symbol`)) || '$';

  delete require.cache[require.resolve('../../resources/messages/crime_success.json')];
  delete require.cache[require.resolve('../../resources/messages/crime_fail.json')];
  const crimeSuccess = require('../../resources/messages/crime_success.json');
  const crimeFail = require('../../resources/messages/crime_fail.json');

  if (ranNum < failRate) {
    const csamount = currencySymbol + fineAmount.toLocaleString();
    const num = Math.floor(Math.random() * (crimeFail.length - 1)) + 1;

    embed
      .setColor(interaction.settings.embedErrorColor)
      .setDescription(crimeFail[num].replace('csamount', csamount))
      .setFooter({ text: `Reply #${num.toLocaleString()}` });
    interaction.editReply({ embeds: [embed] });

    const newAmount = cash - fineAmount;
    await db.set(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.cash`, newAmount.toString());
  } else {
    const amount = BigInt(Math.abs(Math.floor(Math.random() * (max - min + 1) + min)));
    const csamount = currencySymbol + amount.toLocaleString();
    const num = Math.floor(Math.random() * (crimeSuccess.length - 1)) + 1;

    embed
      .setColor(interaction.settings.embedSuccessColor)
      .setDescription(crimeSuccess[num].replace('csamount', csamount))
      .setFooter({ text: `Reply #${num.toLocaleString()}` });
    interaction.editReply({ embeds: [embed] });

    const newAmount = cash + amount;
    await db.set(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.cash`, newAmount.toString());
  }

  userCooldown.time = Date.now() + cooldown * 1000;
  userCooldown.active = true;
  await db.set(`servers.${interaction.guild.id}.users.${interaction.member.id}.economy.${type}.cooldown`, userCooldown);

  // remove the cooldown after the specified time
  setTimeout(async () => {
    userCooldown = {};
    userCooldown.active = false;
    await db.set(
      `servers.${interaction.guild.id}.users.${interaction.member.id}.economy.${type}.cooldown`,
      userCooldown,
    );
  }, cooldown * 1000);
};
